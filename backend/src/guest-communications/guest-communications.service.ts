import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../common/weather.service';
import { renderMergeFields } from '../common/merge-engine';
import { IntegrationsService } from '../integrations/integrations.service';
import { OutlookAdapter } from '../integrations/providers/outlook/outlook.adapter';
import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class SendLetterDto {
  @IsString() templateId: string;
  @IsString() guestName: string;
  @IsString() guestEmail: string;
  @IsString() @IsOptional() roomType?: string;
  @IsDateString() arrivalDate: string;
  @IsDateString() @IsOptional() departureDate?: string;
  @IsString() @IsOptional() pmsReservationId?: string;
  @IsArray() @IsOptional() eventIds?: string[];
  @IsString() @IsOptional() hotelGeneralInfo?: string;
  // Lets the concierge hand-edit the previewed letter before sending —
  // the spec explicitly calls out this personalization step. When
  // provided, these override the freshly-rendered template output rather
  // than being merge-rendered again (they're already final text).
  @IsString() @IsOptional() overrideSubject?: string;
  @IsString() @IsOptional() overrideHtml?: string;
}

@Injectable()
export class GuestCommunicationsService {
  constructor(
    private prisma: PrismaService,
    private weather: WeatherService,
    private integrations: IntegrationsService,
    private outlookAdapter: OutlookAdapter,
  ) {}

  /** Everything the sending wizard's dropdowns need in one call. */
  async getSendContext(tenantId: string) {
    const [tenant, templates, roomTypes] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { branding: true } }),
      this.prisma.letterTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.roomTypeInfo.findMany({ where: { tenantId }, orderBy: { roomTypeName: 'asc' } }),
    ]);
    return { tenant, templates, roomTypes };
  }

  /** Events whose date range overlaps the guest's stay — offered as checkboxes in the wizard. */
  suggestedEvents(tenantId: string, arrivalDate: Date, departureDate: Date) {
    return this.prisma.event.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: departureDate },
        OR: [{ endDate: { gte: arrivalDate } }, { endDate: null, startDate: { gte: arrivalDate } }],
      },
      orderBy: { startDate: 'asc' },
    });
  }

  private formatDate(d: Date) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async buildMergeData(tenantId: string, dto: SendLetterDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { branding: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const arrival = new Date(dto.arrivalDate);
    const departure = dto.departureDate ? new Date(dto.departureDate) : arrival;

    let roomInclusions = '';
    if (dto.roomType) {
      const match = await this.prisma.roomTypeInfo.findFirst({
        where: { tenantId, roomTypeName: { equals: dto.roomType, mode: 'insensitive' } },
      });
      roomInclusions = match?.inclusionsText || '';
    }

    let eventListHtml = '';
    if (dto.eventIds?.length) {
      const events = await this.prisma.event.findMany({ where: { id: { in: dto.eventIds }, tenantId } });
      eventListHtml = events.length
        ? '<ul>' + events.map((e) => `<li><strong>${e.title}</strong> — ${this.formatDate(e.startDate)}${e.location ? ` (${e.location})` : ''}</li>`).join('') + '</ul>'
        : '';
    }

    const weatherForecast = await this.weather.getForecastText(
      tenant.branding?.latitude, tenant.branding?.longitude, arrival,
    );

    const firstName = dto.guestName.trim().split(/\s+/)[0] || dto.guestName;

    return {
      guest_first_name: firstName,
      guest_full_name: dto.guestName,
      room_type: dto.roomType || '',
      room_inclusions: roomInclusions,
      arrival_date: this.formatDate(arrival),
      departure_date: dto.departureDate ? this.formatDate(departure) : '',
      hotel_name: tenant.branding?.siteTitle || tenant.name,
      hotel_general_info: dto.hotelGeneralInfo || tenant.branding?.siteSubtitle || '',
      weather_forecast: weatherForecast,
      event_list: eventListHtml,
    };
  }

  async preview(dto: SendLetterDto, tenantId: string) {
    const template = await this.prisma.letterTemplate.findFirst({ where: { id: dto.templateId, tenantId } });
    if (!template) throw new NotFoundException('Letter template not found');

    const mergeData = await this.buildMergeData(tenantId, dto);
    return {
      subject: renderMergeFields(template.subject, mergeData),
      html: renderMergeFields(template.bodyHtml, mergeData),
    };
  }

  async send(dto: SendLetterDto, user: { id: string; tenantId?: string }) {
    const tenantId = user.tenantId;
    if (!tenantId) throw new BadRequestException('Your account has no tenant');

    const template = await this.prisma.letterTemplate.findFirst({ where: { id: dto.templateId, tenantId } });
    if (!template) throw new NotFoundException('Letter template not found');

    const mergeData = await this.buildMergeData(tenantId, dto);
    const subject = dto.overrideSubject ?? renderMergeFields(template.subject, mergeData);
    const finalHtml = dto.overrideHtml ?? renderMergeFields(template.bodyHtml, mergeData);

    const credentials = await this.integrations.getOutlookCredentials(tenantId);
    let status = 'FAILED';
    let errorMessage: string | undefined;

    if (!credentials) {
      errorMessage = 'Outlook is not configured for this tenant yet — ask your Super Admin to set it up.';
    } else {
      const result = await this.outlookAdapter.sendMail(credentials, dto.guestEmail, subject, finalHtml);
      if (result.success) status = 'SENT';
      else errorMessage = result.error;
    }

    const record = await this.prisma.guestCommunication.create({
      data: {
        tenantId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        pmsReservationId: dto.pmsReservationId,
        templateId: dto.templateId,
        finalHtml,
        eventIds: dto.eventIds || [],
        weatherSnapshot: { text: mergeData.weather_forecast },
        sentByUserId: user.id,
        status,
      },
    });

    if (status === 'FAILED') {
      throw new BadRequestException(errorMessage || 'Failed to send the letter — it has been logged as failed.');
    }

    return record;
  }

  findHistory(tenantId: string) {
    return this.prisma.guestCommunication.findMany({
      where: { tenantId },
      orderBy: { sentAt: 'desc' },
      include: { template: { select: { name: true } }, sentBy: { select: { name: true } } },
      take: 200,
    });
  }
}

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

// Service fields an Excel column can be mapped to. Filter-group columns are
// handled separately (mapped value looks like "filter:<filterGroupId>").
export const IMPORTABLE_FIELDS = [
  { key: 'name', label: 'Service Name', required: true },
  { key: 'description', label: 'Description' },
  { key: 'priceInfo', label: 'Price Info (display text, e.g. "€45 one way")' },
  { key: 'priceAmount', label: 'Price Amount (number)' },
  { key: 'priceCurrency', label: 'Currency (EUR/USD/SCR)' },
  { key: 'contactName', label: 'Contact Name' },
  { key: 'contactPhone', label: 'Contact Phone' },
] as const;

// Heuristics for auto-suggesting a mapping from a raw header string.
// Deliberately simple substring matching — good enough to save the admin
// re-selecting every column by hand for typical price-sheet exports, while
// staying easy to reason about (no fuzzy-matching library dependency).
const FIELD_SYNONYMS: Record<string, string[]> = {
  name: ['service', 'name', 'item', 'title'],
  description: ['description', 'desc', 'details', 'notes'],
  priceInfo: ['price info', 'price text', 'price display'],
  priceAmount: ['price', 'amount', 'cost', 'rate'],
  priceCurrency: ['currency', 'ccy'],
  contactName: ['contact name', 'contact person', 'supplier'],
  contactPhone: ['phone', 'contact phone', 'tel', 'mobile'],
};

export interface ParsedFile {
  headers: string[];
  rows: (string | number)[][];
  totalRows: number;
  suggestedMapping: Record<number, string>;
}

export interface CommitImportDto {
  categoryId: string;
  // headerIndex -> 'name' | 'description' | ... | 'filter:<filterGroupId>' | 'ignore'
  mapping: Record<number, string>;
  rows: (string | number)[][];
  mode: 'replace' | 'append';
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  parseFile(buffer: Buffer, previewLimit = 25): ParsedFile {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Could not read this file — please upload a valid .xlsx, .xls, or .csv file');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('The file has no sheets');
    const sheet = workbook.Sheets[sheetName];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

    if (raw.length === 0) throw new BadRequestException('The sheet is empty');

    const headers = raw[0].map((h) => String(h ?? '').trim());
    const dataRows = raw.slice(1).filter((r) => r.some((c) => c !== '' && c !== null && c !== undefined));

    return {
      headers,
      rows: dataRows.slice(0, previewLimit),
      totalRows: dataRows.length,
      suggestedMapping: this.suggestMapping(headers),
      // Full row data is re-derived on commit from the client-submitted
      // (and possibly user-edited) preview, not stored server-side between
      // requests — keeps this endpoint stateless.
    } as any;
  }

  /** Re-parses the full file (not just the preview) for the actual commit. */
  parseAllRows(buffer: Buffer): { headers: string[]; rows: (string | number)[][] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
    const headers = raw[0].map((h) => String(h ?? '').trim());
    const rows = raw.slice(1).filter((r) => r.some((c) => c !== '' && c !== null && c !== undefined));
    return { headers, rows };
  }

  private suggestMapping(headers: string[]): Record<number, string> {
    const mapping: Record<number, string> = {};
    headers.forEach((header, i) => {
      const normalized = header.toLowerCase().trim();
      for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
        if (synonyms.some((s) => normalized.includes(s))) {
          mapping[i] = field;
          break;
        }
      }
    });
    return mapping;
  }

  private async assertCanImportInto(categoryId: string, user: { role: string; tenantId?: string }) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { filterGroups: { include: { options: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (user.role !== 'SUPER_ADMIN' && category.tenantId !== user.tenantId) {
      throw new ForbiddenException('You can only import into a category that belongs to your own tenant');
    }

    return category;
  }

  async getTargetCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { filterGroups: { include: { options: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async commit(dto: CommitImportDto, user: { id: string; role: string; tenantId?: string }) {
    const category = await this.assertCanImportInto(dto.categoryId, user);

    const fieldEntries = Object.entries(dto.mapping).filter(([, v]) => v && v !== 'ignore');
    const nameColumn = fieldEntries.find(([, v]) => v === 'name');
    if (!nameColumn) throw new BadRequestException('At least one column must be mapped to "Service Name"');
    const nameIdx = Number(nameColumn[0]);

    const filterColumns = fieldEntries.filter(([, v]) => v.startsWith('filter:'));
    const plainColumns = fieldEntries.filter(([, v]) => !v.startsWith('filter:') && v !== 'name');

    if (dto.mode === 'replace') {
      await this.prisma.service.deleteMany({ where: { categoryId: dto.categoryId } });
    }

    let created = 0;
    let skipped = 0;
    const filterOptionCache = new Map<string, string>(); // "groupId::label(lowercase)" -> optionId

    for (const row of dto.rows) {
      const name = String(row[nameIdx] ?? '').trim();
      if (!name) { skipped++; continue; }

      const data: any = {
        categoryId: dto.categoryId,
        tenantId: category.tenantId,
        name,
      };
      for (const [idxStr, field] of plainColumns) {
        const idx = Number(idxStr);
        const raw = row[idx];
        if (raw === undefined || raw === null || raw === '') continue;
        if (field === 'priceAmount') {
          const n = Number(raw);
          if (!Number.isNaN(n)) data.priceAmount = n;
        } else {
          data[field] = String(raw);
        }
      }

      const service = await this.prisma.service.create({ data });
      created++;

      for (const [idxStr, mappedField] of filterColumns) {
        const idx = Number(idxStr);
        const filterGroupId = mappedField.replace('filter:', '');
        const rawValue = String(row[idx] ?? '').trim();
        if (!rawValue) continue;

        // A cell may contain multiple values separated by comma/slash
        // (e.g. "Japanese, Fusion") — each becomes its own FilterOption match.
        const labels = rawValue.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
        for (const label of labels) {
          const cacheKey = `${filterGroupId}::${label.toLowerCase()}`;
          let optionId = filterOptionCache.get(cacheKey);
          if (!optionId) {
            const group = category.filterGroups.find((g) => g.id === filterGroupId);
            const existing = group?.options.find((o) => o.label.toLowerCase() === label.toLowerCase());
            if (existing) {
              optionId = existing.id;
            } else {
              // Not found among existing options — create it. This is the
              // simplest reading of the spec's "suggest creating a new
              // filter option" for a first version; there's no separate
              // confirmation round-trip here (see PART6 doc).
              const createdOption = await this.prisma.filterOption.create({
                data: { filterGroupId, label, sortOrder: 999 },
              });
              optionId = createdOption.id;
              group?.options.push(createdOption as any);
            }
            filterOptionCache.set(cacheKey, optionId);
          }
          await this.prisma.serviceFilterValue.create({
            data: { serviceId: service.id, filterOptionId: optionId },
          }).catch(() => { /* duplicate pair — ignore */ });
        }
      }
    }

    return { created, skipped, mode: dto.mode };
  }
}

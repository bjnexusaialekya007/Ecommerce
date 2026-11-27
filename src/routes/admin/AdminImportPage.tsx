import { useState } from 'react';
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useStore } from '../../stores/appContext';
import { useUiStore } from '../../stores/ui';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';

const TEMPLATE_CSV = [
  'product_slug,product_name,category_slug,veg,hsn_code,gst_rate,shelf_life_days,ingredients,sku_code,pack_label,net_weight_g,ship_weight_g,mrp_rupees,retail_rupees,wholesale_rupees,wholesale_moq,stock_qty,status',
  'methi-mathri,Crispy Methi Mathri,boondi-crunch,1,19059090,5,60,"Refined Wheat Flour, Kasuri Methi, Cold-Pressed Oil, Ajwain, Salt",MMT-250,250 g,250,285,130,110,78,10,30,active',
].join('\n');

function parseCsvLines(text: string): Array<Record<string, unknown>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const splitRow = (row: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitRow(line);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? '';
    });
    return obj;
  });
}

export function AdminImportPage() {
  const { catalog, refreshCatalog } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [csvText, setCsvText] = useState(TEMPLATE_CSV);
  const [dryRunResult, setDryRunResult] = useState<{
    ok: boolean;
    errors: Array<{ row: number; error: string }>;
    validCount: number;
  } | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, unknown>>>([]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCatalog = () => {
    if (!catalog) return;
    const headers = 'sku_code,product_name,pack_label,net_weight_g,retail_rupees,wholesale_rupees,stock_qty,status';
    const rows = catalog.skus.map((s) => {
      const p = catalog.products.find((pr) => pr.id === s.productId);
      return [
        s.skuCode,
        `"${p?.name || ''}"`,
        s.packLabel,
        s.netWeightG,
        (s.retailPricePaise / 100).toFixed(2),
        s.wholesalePricePaise ? (s.wholesalePricePaise / 100).toFixed(2) : '',
        s.stockQty,
        s.status,
      ].join(',');
    });
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDryRun = async () => {
    const rows = parseCsvLines(csvText);
    setParsedRows(rows);
    const res = await api.adminCsvDryRun(rows);
    setDryRunResult(res);
  };

  const handleCommit = async () => {
    if (!dryRunResult?.ok) return;
    const res = await api.adminCsvCommit(parsedRows);
    await refreshCatalog();
    pushToast({ message: `Imported ${res.imported} SKUs cleanly.`, tone: 'success' });
    setDryRunResult(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Catalog CSV Import &amp; Export</h1>
          <p className="text-sm text-[var(--ink-muted)]">Validate every row in a dry-run preview before committing changes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" aria-hidden="true" /> Template CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCatalog}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export Current Catalog
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
        <Textarea
          label="Paste CSV rows (or edit template sample below)"
          rows={6}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setDryRunResult(null);
          }}
          className="font-mono text-xs"
        />

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleDryRun}>
            Validate (Dry Run)
          </Button>
          {dryRunResult?.ok && (
            <Button variant="primary" onClick={handleCommit}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Commit {dryRunResult.validCount} Rows
            </Button>
          )}
        </div>

        {dryRunResult && (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 text-sm space-y-2">
            {dryRunResult.ok ? (
              <p className="flex items-center gap-2 font-semibold text-[var(--success)]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Dry-run passed: {dryRunResult.validCount} rows ready to commit.
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 font-semibold text-[var(--danger)]">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Found {dryRunResult.errors.length} validation error(s):
                </p>
                <ul className="list-disc pl-5 text-xs text-[var(--danger)] space-y-1">
                  {dryRunResult.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

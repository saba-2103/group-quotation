'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { bulkImportMembers } from '@/lib/api/quotation-client';
import { CensusQuality } from '@/lib/types';

const SYSTEM_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
  { value: 'gender', label: 'Gender' },
  { value: 'grade', label: 'Grade' },
  { value: 'salary', label: 'Salary' },
  { value: 'sumAssured', label: 'Sum Assured' },
  { value: '__ignore__', label: '— Ignore —' },
];

// Simulated file columns (in a real app these come from the upload step via state/URL params)
const DEMO_COLUMNS = ['EmpName', 'DOB', 'Sex', 'Department', 'BasicPay', 'InsuredAmt', 'EmployeeCode'];

const DEFAULT_MAPPING: Record<string, string> = {
  EmpName: 'name',
  DOB: 'dateOfBirth',
  Sex: 'gender',
  Department: 'grade',
  BasicPay: 'salary',
  InsuredAmt: 'sumAssured',
  EmployeeCode: '__ignore__',
};

export default function CensusMappingPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const [mapping, setMapping] = useState<Record<string, string>>(DEFAULT_MAPPING);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      // Simulate mapping: generate 50 dummy members using the mapping definition
      const NAMES = ['Amit Kumar', 'Sunita Rao', 'Rajesh Iyer', 'Meena Singh', 'Suresh Das',
        'Kavitha Nair', 'Deepak Joshi', 'Anita Mishra', 'Vikas Sharma', 'Pooja Gupta'];
      const GRADES = ['G1', 'G2', 'G3'];
      const generated = Array.from({ length: 50 }, (_, i) => ({
        name: NAMES[i % NAMES.length] + ` ${i + 1}`,
        dateOfBirth: `${1975 + (i % 20)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
        gender: i % 3 === 0 ? 'F' : 'M',
        grade: GRADES[i % GRADES.length],
        salary: 600000 + (i % 10) * 120000,
        sumAssured: 1200000 + (i % 10) * 240000,
      }));

      const result = await bulkImportMembers(rfqId, generated);
      // Update bundle members and censusSummary
      const newMembers = generated.map((m, i) => ({
        ...m,
        memberNumber: `MBR-MAP-${String(i + 1).padStart(3, '0')}`,
        rfqId,
        coverages: [] as never[],
      }));
      updateBundle({
        members: [...bundle.members, ...newMembers],
        censusSummary: {
          totalLives: bundle.members.length + result.imported,
          quality: { trafficLight: CensusQuality.A },
        },
      });
      router.push(`/rfqs/${rfqId}/census-workbench`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed');
      setApplying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Map Census Columns</h1>
      <p className="text-xs text-muted-foreground mb-5">
        Match your file's columns to the system fields. Unneeded columns can be ignored.
      </p>

      <div className="rounded-xl border border-border overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">File column</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">System field</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_COLUMNS.map((col) => (
              <tr key={col} className="border-b border-border/30 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{col}</td>
                <td className="px-4 py-2.5">
                  <Select
                    value={mapping[col] ?? '__ignore__'}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [col]: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          onClick={() => router.push(`/rfqs/${rfqId}/census-workbench`)}
          disabled={applying}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleApply} disabled={applying} className="gap-1.5">
          {applying && <Loader2 className="size-3.5 animate-spin" />}
          Apply mapping
        </Button>
      </div>
    </div>
  );
}

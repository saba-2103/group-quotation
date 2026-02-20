import type { TableConfig, RowData } from "@shared/types";

// ============================================
// Plan Profile Details Table Configuration
// ============================================

export const planProfileDetailsConfig: TableConfig = {
  columns: [
    {
      id: "planNumber",
      header: "Plan Number",
      accessorKey: "planNumber",
      width: "120px",
      type: "link"
    },
    {
      id: "planDescription",
      header: "Plan Description",
      accessorKey: "planDescription",
      width: "250px",
      type: "text"
    },
    {
      id: "fromAge",
      header: "From Age",
      accessorKey: "fromAge",
      width: "100px",
      type: "text",
      align: "right"
    },
    {
      id: "toAge",
      header: "To Age",
      accessorKey: "toAge",
      width: "100px",
      type: "text",
      align: "right"
    },
    {
      id: "maleMemberCount",
      header: "Male Member Count",
      accessorKey: "maleMemberCount",
      width: "150px",
      type: "text",
      align: "right"
    },
    {
      id: "femaleMemberCount",
      header: "Female Member Count",
      accessorKey: "femaleMemberCount",
      width: "160px",
      type: "text",
      align: "right"
    },
    {
      id: "dependentAdultCount",
      header: "Dependent Adult Count",
      accessorKey: "dependentAdultCount",
      width: "180px",
      type: "text",
      align: "right"
    },
    {
      id: "dependentChildrenCount",
      header: "Dependent Children Count",
      accessorKey: "dependentChildrenCount",
      width: "200px",
      type: "text",
      align: "right"
    },
    {
      id: "totalSumInsured",
      header: "Total Sum Insured",
      accessorKey: "totalSumInsured",
      width: "160px",
      type: "text",
      align: "right"
    },
    {
      id: "averageAge",
      header: "Average Age",
      accessorKey: "averageAge",
      width: "120px",
      type: "text",
      align: "right"
    },
    {
      id: "averageSumInsured",
      header: "Average Sum Insured",
      accessorKey: "averageSumInsured",
      width: "180px",
      type: "text",
      align: "right"
    }
  ],
  selectable: false,
  pagination: {
    enabled: true,
    pageSize: 10
  }
};

// ============================================
// Plan Profile Details Mock Data
// ============================================

export const planProfileDetailsData: RowData[] = [
  {
    id: "1",
    planNumber: "P01",
    planDescription: "Base Death Benefit",
    fromAge: "18",
    toAge: "60",
    maleMemberCount: "450",
    femaleMemberCount: "350",
    dependentAdultCount: "200",
    dependentChildrenCount: "150",
    totalSumInsured: "4,00,00,000",
    averageAge: "35",
    averageSumInsured: "5,00,000"
  },
  {
    id: "2",
    planNumber: "P02",
    planDescription: "Base Death Benefit with Critical Illness (10)",
    fromAge: "18",
    toAge: "65",
    maleMemberCount: "200",
    femaleMemberCount: "180",
    dependentAdultCount: "100",
    dependentChildrenCount: "80",
    totalSumInsured: "3,00,00,000",
    averageAge: "38",
    averageSumInsured: "7,50,000"
  },
  {
    id: "3",
    planNumber: "P03",
    planDescription: "Base Death Benefit with Critical Illness (25)",
    fromAge: "60",
    toAge: "80",
    maleMemberCount: "80",
    femaleMemberCount: "70",
    dependentAdultCount: "50",
    dependentChildrenCount: "20",
    totalSumInsured: "1,50,00,000",
    averageAge: "68",
    averageSumInsured: "10,00,000"
  }
];

import { Member } from '../types';

const now = '2026-04-30T00:00:00Z';

// Helper to build a member record
function m(
  id: string,
  policyId: string,
  empId: string,
  first: string,
  last: string,
  dob: string,
  gender: 'Male' | 'Female',
  doj: string,
  dept: string,
  grade: string,
  location: string,
  cls: string,
  status: Member['status'],
  extras: Partial<Member> = {}
): Member {
  return {
    id,
    policyId,
    organizationId: 'org-001',
    employeeId: empId,
    title: gender === 'Male' ? 'Mr' : 'Mrs',
    firstName: first,
    lastName: last,
    dob,
    gender,
    mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@acmetech.com`,
    pan: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
    aadhaarLast4: String(Math.floor(1000 + Math.random() * 9000)),
    doj,
    department: dept,
    grade,
    location,
    memberClass: cls,
    status,
    coverageId: `cov-${id}`,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: now,
    ...extras,
  };
}

// 30 GTL members
const gtlMembers: Member[] = [
  m('mbr-001', 'pol-gtl-001', 'EMP001', 'Rajesh', 'Kumar', '1978-03-15', 'Male', '2015-06-01', 'Technology', 'VP', 'Mumbai', 'Plan A', 'Active'),
  m('mbr-002', 'pol-gtl-001', 'EMP002', 'Priya', 'Sharma', '1985-07-22', 'Female', '2018-01-10', 'Finance', 'Manager', 'Mumbai', 'Plan B', 'Active'),
  m('mbr-003', 'pol-gtl-001', 'EMP003', 'Anil', 'Verma', '1990-11-05', 'Male', '2020-03-15', 'Operations', 'Executive', 'Delhi', 'Plan B', 'Active'),
  m('mbr-004', 'pol-gtl-001', 'EMP004', 'Sunita', 'Patel', '1982-04-18', 'Female', '2012-08-01', 'HR', 'Senior Manager', 'Bangalore', 'Plan A', 'Active'),
  m('mbr-005', 'pol-gtl-001', 'EMP005', 'Vikram', 'Singh', '1975-09-30', 'Male', '2008-04-01', 'Technology', 'Director', 'Mumbai', 'Plan A', 'Active'),
  m('mbr-006', 'pol-gtl-001', 'EMP006', 'Meera', 'Nair', '1992-01-25', 'Female', '2021-07-01', 'Marketing', 'Executive', 'Hyderabad', 'Plan B', 'Active'),
  m('mbr-007', 'pol-gtl-001', 'EMP007', 'Suresh', 'Rao', '1988-06-12', 'Male', '2019-02-15', 'Sales', 'Manager', 'Chennai', 'Plan B', 'Active'),
  m('mbr-008', 'pol-gtl-001', 'EMP008', 'Kavitha', 'Reddy', '1993-08-07', 'Female', '2022-01-10', 'Finance', 'Analyst', 'Hyderabad', 'Plan B', 'Active'),
  m('mbr-009', 'pol-gtl-001', 'EMP009', 'Deepak', 'Joshi', '1980-12-20', 'Male', '2010-09-01', 'Technology', 'Senior Manager', 'Pune', 'Plan A', 'Active'),
  m('mbr-010', 'pol-gtl-001', 'EMP010', 'Anita', 'Desai', '1987-03-03', 'Female', '2017-05-15', 'Operations', 'Manager', 'Mumbai', 'Plan B', 'Active'),
  m('mbr-011', 'pol-gtl-001', 'EMP011', 'Mohan', 'Pillai', '1995-10-14', 'Male', '2023-04-01', 'Technology', 'Associate', 'Bangalore', 'Plan B', 'Active'),
  m('mbr-012', 'pol-gtl-001', 'EMP012', 'Lakshmi', 'Iyer', '1983-05-28', 'Female', '2013-11-01', 'Legal', 'Senior Manager', 'Chennai', 'Plan A', 'Active'),
  m('mbr-013', 'pol-gtl-001', 'EMP013', 'Ravi', 'Chandra', '1991-02-17', 'Male', '2020-08-10', 'Sales', 'Executive', 'Delhi', 'Plan B', 'Active'),
  m('mbr-014', 'pol-gtl-001', 'EMP014', 'Pooja', 'Gupta', '1989-07-09', 'Female', '2018-11-15', 'Marketing', 'Manager', 'Mumbai', 'Plan B', 'Active'),
  m('mbr-015', 'pol-gtl-001', 'EMP015', 'Sanjay', 'Bhatt', '1977-04-23', 'Male', '2007-03-01', 'Finance', 'VP', 'Mumbai', 'Plan A', 'Active'),
  m('mbr-016', 'pol-gtl-001', 'EMP016', 'Geeta', 'Sinha', '1994-09-11', 'Female', '2022-06-01', 'HR', 'Executive', 'Kolkata', 'Plan B', 'Active'),
  m('mbr-017', 'pol-gtl-001', 'EMP017', 'Ajay', 'Mishra', '1986-01-30', 'Male', '2016-04-01', 'Technology', 'Manager', 'Pune', 'Plan B', 'Active'),
  m('mbr-018', 'pol-gtl-001', 'EMP018', 'Nisha', 'Saxena', '1990-06-22', 'Female', '2019-09-01', 'Operations', 'Executive', 'Delhi', 'Plan B', 'Active'),
  m('mbr-019', 'pol-gtl-001', 'EMP019', 'Vivek', 'Kapoor', '1984-11-08', 'Male', '2014-01-15', 'Sales', 'Senior Manager', 'Ahmedabad', 'Plan A', 'Active'),
  m('mbr-020', 'pol-gtl-001', 'EMP020', 'Rekha', 'Pandey', '1996-03-27', 'Female', '2023-01-10', 'Finance', 'Analyst', 'Mumbai', 'Plan B', 'Active'),
  m('mbr-021', 'pol-gtl-001', 'EMP021', 'Ashok', 'Tiwari', '1979-08-14', 'Male', '2009-07-01', 'Technology', 'Director', 'Bangalore', 'Plan A', 'Active'),
  m('mbr-022', 'pol-gtl-001', 'EMP022', 'Smita', 'Rane', '1988-12-02', 'Female', '2018-04-01', 'Legal', 'Manager', 'Mumbai', 'Plan B', 'Active'),
  m('mbr-023', 'pol-gtl-001', 'EMP023', 'Kiran', 'Malhotra', '1992-04-19', 'Male', '2021-02-01', 'Marketing', 'Executive', 'Gurgaon', 'Plan B', 'Active'),
  m('mbr-024', 'pol-gtl-001', 'EMP024', 'Divya', 'Srivastava', '1985-10-06', 'Female', '2015-09-01', 'HR', 'Senior Manager', 'Delhi', 'Plan A', 'Active'),
  m('mbr-025', 'pol-gtl-001', 'EMP025', 'Nikhil', 'Chopra', '1997-06-15', 'Male', '2024-01-15', 'Technology', 'Associate', 'Hyderabad', 'Plan C', 'Pending Approval', {
    makerId: 'usr-002',
    requestRef: 'REQ-MBR-2024-001',
  }),
  m('mbr-026', 'pol-gtl-001', 'EMP026', 'Tanya', 'Agarwal', '1991-02-28', 'Female', '2021-10-01', 'Finance', 'Manager', 'Mumbai', 'Plan B', 'Pending Exit', {
    lwdDate: '2026-05-15',
    exitReason: 'Resignation',
    makerId: 'usr-002',
  }),
  m('mbr-027', 'pol-gtl-001', 'EMP027', 'Ramesh', 'Bose', '1970-07-10', 'Male', '2000-04-01', 'Operations', 'GM', 'Kolkata', 'Plan A', 'Exited', {
    lwdDate: '2025-12-31',
    exitReason: 'Retirement',
  }),
  m('mbr-028', 'pol-gtl-001', 'EMP028', 'Usha', 'Menon', '1988-09-25', 'Female', '2019-03-01', 'Sales', 'Manager', 'Cochin', 'Plan B', 'Exited', {
    lwdDate: '2026-02-28',
    exitReason: 'Resignation',
  }),
  m('mbr-029', 'pol-gtl-001', 'EMP029', 'Harish', 'Dewan', '1993-05-20', 'Male', '2022-07-01', 'Technology', 'Executive', 'Pune', 'Plan B', 'Active'),
  m('mbr-030', 'pol-gtl-001', 'EMP030', 'Pallavi', 'Jain', '1986-03-12', 'Female', '2016-11-01', 'Marketing', 'Senior Manager', 'Mumbai', 'Plan A', 'Active'),
];

// 12 GCL members (borrowers)
const gclMembers: Member[] = [
  m('mbr-031', 'pol-gcl-002', 'BRW001', 'Shyam', 'Sundar', '1980-05-15', 'Male', '2024-01-01', 'N/A', 'N/A', 'Mumbai', 'Home Loan', 'Active'),
  m('mbr-032', 'pol-gcl-002', 'BRW002', 'Radha', 'Krishna', '1982-08-22', 'Female', '2024-02-01', 'N/A', 'N/A', 'Delhi', 'Home Loan', 'Active'),
  m('mbr-033', 'pol-gcl-002', 'BRW003', 'Ganesh', 'Prasad', '1975-11-30', 'Male', '2023-11-01', 'N/A', 'N/A', 'Bangalore', 'Home Loan', 'Active'),
  m('mbr-034', 'pol-gcl-002', 'BRW004', 'Kamala', 'Devi', '1978-03-07', 'Female', '2024-03-01', 'N/A', 'N/A', 'Chennai', 'Home Loan', 'Active'),
  m('mbr-035', 'pol-gcl-002', 'BRW005', 'Naresh', 'Babu', '1985-06-18', 'Male', '2024-04-01', 'N/A', 'N/A', 'Hyderabad', 'Home Loan', 'Active'),
  m('mbr-036', 'pol-gcl-002', 'BRW006', 'Sarita', 'Dutta', '1990-01-25', 'Female', '2024-05-01', 'N/A', 'N/A', 'Kolkata', 'Home Loan', 'Active'),
  m('mbr-037', 'pol-gcl-002', 'BRW007', 'Bharat', 'Shah', '1983-09-12', 'Male', '2023-12-01', 'N/A', 'N/A', 'Ahmedabad', 'Home Loan', 'Active'),
  m('mbr-038', 'pol-gcl-002', 'BRW008', 'Annapurna', 'Pillai', '1977-04-20', 'Female', '2024-01-15', 'N/A', 'N/A', 'Cochin', 'Home Loan', 'Active'),
  m('mbr-039', 'pol-gcl-002', 'BRW009', 'Vijay', 'Murthy', '1988-12-05', 'Male', '2024-06-01', 'N/A', 'N/A', 'Pune', 'Home Loan', 'Active'),
  m('mbr-040', 'pol-gcl-002', 'BRW010', 'Madhuri', 'Joshi', '1992-07-15', 'Female', '2024-07-01', 'N/A', 'N/A', 'Nagpur', 'Home Loan', 'Active'),
  m('mbr-041', 'pol-gcl-002', 'BRW011', 'Sunil', 'Ghosh', '1979-02-28', 'Male', '2023-10-01', 'N/A', 'N/A', 'Kolkata', 'Home Loan', 'Exited', {
    lwdDate: '2026-01-31',
    exitReason: 'Loan Closed',
  }),
  m('mbr-042', 'pol-gcl-002', 'BRW012', 'Parvati', 'Nambiar', '1985-10-10', 'Female', '2024-08-01', 'N/A', 'N/A', 'Cochin', 'Home Loan', 'Active'),
];

// 8 Savings members
const savingsMembers: Member[] = [
  m('mbr-043', 'pol-sav-003', 'EMP043', 'Gopal', 'Das', '1972-04-01', 'Male', '1998-07-01', 'Operations', 'GM', 'Mumbai', 'Gratuity', 'Active'),
  m('mbr-044', 'pol-sav-003', 'EMP044', 'Indira', 'Krishnan', '1975-08-15', 'Female', '2002-01-01', 'Finance', 'VP', 'Chennai', 'Gratuity', 'Active'),
  m('mbr-045', 'pol-sav-003', 'EMP045', 'Santosh', 'Yadav', '1980-03-22', 'Male', '2005-04-01', 'HR', 'Director', 'Delhi', 'Gratuity', 'Active'),
  m('mbr-046', 'pol-sav-003', 'EMP046', 'Mamta', 'Shukla', '1983-11-10', 'Female', '2008-09-01', 'Legal', 'Senior Manager', 'Lucknow', 'Gratuity', 'Active'),
  m('mbr-047', 'pol-sav-003', 'EMP047', 'Dinesh', 'Acharya', '1977-06-28', 'Male', '2003-04-01', 'Technology', 'AVP', 'Bangalore', 'Gratuity', 'Active'),
  m('mbr-048', 'pol-sav-003', 'EMP048', 'Sarla', 'Misra', '1985-02-14', 'Female', '2010-07-01', 'Marketing', 'Manager', 'Jaipur', 'Gratuity', 'Active'),
  m('mbr-049', 'pol-sav-003', 'EMP049', 'Pratap', 'Singh', '1968-09-05', 'Male', '1995-01-01', 'Operations', 'GM', 'Mumbai', 'Gratuity', 'Exited', {
    lwdDate: '2025-12-31',
    exitReason: 'Retirement',
  }),
  m('mbr-050', 'pol-sav-003', 'EMP050', 'Vimla', 'Devi', '1970-12-25', 'Male', '1997-04-01', 'Finance', 'CFO', 'Mumbai', 'Gratuity', 'Active'),
];

export const members: Member[] = [...gtlMembers, ...gclMembers, ...savingsMembers];

export function getRevenueRentBasis(
  dealType: string | null | undefined,
  rentAmount: number | null | undefined,
  _monthlyRentAmount?: number | null
): number {
  const totalOwnerRentIncome = Number(rentAmount || 0);

  // Shortlet bonus/revenue basis is 20% of total owner rent income.
  if (dealType === 'shortlet') {
    return totalOwnerRentIncome * 0.20;
  }

  return totalOwnerRentIncome;
}

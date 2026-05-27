export const formatPrice = (
  price: { amount: number; currency?: string },
  lang?: string,
) => {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price.amount / 100);
};

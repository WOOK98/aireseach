"use client";

import {
  BillingDiscountType,
  calculateDiscount,
  getVariantWithHighestDiscount,
  formatPrice,
  getVariantInitialCost,
} from "@workspace/billing";
import { Trans } from "@workspace/i18n";
import { Icons } from "@workspace/ui-web/icons";

export const Discount = () => {
  const variantWithHighestDiscount = getVariantWithHighestDiscount();

  if (!variantWithHighestDiscount?.discount) {
    return null;
  }

  const discount = calculateDiscount(
    variantWithHighestDiscount,
    variantWithHighestDiscount.discount,
  );

  if (!discount) {
    return null;
  }

  return (
    <p className="sm mt-2 text-center md:text-lg">
      <Icons.Gift className="text-primary mr-1.5 mb-1.5 inline-block h-5 w-5" />
      <span className="text-primary">
        <Trans
          i18nKey="billing:discount.specialOffer"
          values={{
            discount:
              discount.type === BillingDiscountType.PERCENT
                ? `${discount.percentage}%`
                : formatPrice({
                    amount:
                      getVariantInitialCost(discount.original) -
                      getVariantInitialCost(discount.discounted),
                    currency: discount.discounted.currency,
                  }),
          }}
          components={{
            bold: <span className="font-semibold" />,
          }}
        />
      </span>
    </p>
  );
};

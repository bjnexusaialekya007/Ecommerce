export interface LineGstBreakdown {
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  lineTotalPaise: number;
}

/**
 * Line-level integer GST calculation.
 * Rule: Round at the line level using Math.round; for intra-state supply,
 * CGST = Math.floor(tax / 2) and SGST = tax - CGST so CGST + SGST === tax exactly.
 */
export function computeLineGst(params: {
  basisPaise: number;
  gstRate: number;
  inclusive: boolean;
  isInterState: boolean;
}): LineGstBreakdown {
  const { basisPaise, gstRate, inclusive, isInterState } = params;
  const safeBasis = Math.max(0, Math.round(basisPaise));

  let taxablePaise: number;
  let taxPaise: number;
  let lineTotalPaise: number;

  if (inclusive) {
    taxablePaise = Math.round((safeBasis * 100) / (100 + gstRate));
    taxPaise = safeBasis - taxablePaise;
    lineTotalPaise = safeBasis;
  } else {
    taxablePaise = safeBasis;
    taxPaise = Math.round((taxablePaise * gstRate) / 100);
    lineTotalPaise = taxablePaise + taxPaise;
  }

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  if (isInterState) {
    igstPaise = taxPaise;
  } else {
    cgstPaise = Math.floor(taxPaise / 2);
    sgstPaise = taxPaise - cgstPaise;
  }

  return {
    taxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    taxPaise,
    lineTotalPaise,
  };
}

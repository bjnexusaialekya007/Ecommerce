export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export const SOUTH_INDIA_STATE_CODES = new Set(['29', '32', '33', '34', '36', '37']);

export const PINCODE_PREFIX_TO_STATE: Array<{ prefix: string; stateCode: string; city: string }> = [
  { prefix: '50', stateCode: '36', city: 'Hyderabad' },
  { prefix: '51', stateCode: '37', city: 'Tirupati / Kurnool' },
  { prefix: '52', stateCode: '37', city: 'Vijayawada / Guntur' },
  { prefix: '53', stateCode: '37', city: 'Visakhapatnam' },
  { prefix: '56', stateCode: '29', city: 'Bengaluru' },
  { prefix: '60', stateCode: '33', city: 'Chennai' },
  { prefix: '68', stateCode: '32', city: 'Kochi' },
  { prefix: '40', stateCode: '27', city: 'Mumbai' },
  { prefix: '41', stateCode: '27', city: 'Pune' },
  { prefix: '38', stateCode: '24', city: 'Ahmedabad' },
  { prefix: '30', stateCode: '08', city: 'Jaipur' },
  { prefix: '33', stateCode: '08', city: 'Bikaner' },
  { prefix: '11', stateCode: '07', city: 'New Delhi' },
  { prefix: '70', stateCode: '19', city: 'Kolkata' },
];

export function lookupStateByPincode(pincode: string): { stateCode: string; city: string } | null {
  if (!/^\d{6}$/.test(pincode)) return null;
  const p2 = pincode.slice(0, 2);
  const found = PINCODE_PREFIX_TO_STATE.find((e) => e.prefix === p2);
  return found ? { stateCode: found.stateCode, city: found.city } : null;
}

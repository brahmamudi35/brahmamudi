/** Business details shown on the public / legal pages (About, Contact,
 *  Terms, Privacy, Refund). Taken from the original brahmamudi.com site. */
export const SITE = {
  name: "brahmamudi",
  url: "https://brahmamudi.com",
  operator: "Vishwabrahmana Vivaha Seva Samithi",
  address: ["8-3-169/75, Siddhartha Nagar", "Hyderabad, Telangana 500038", "India"],
  email: "brahmamudi36@gmail.com",
  phone: "+91 95501 11166",
  whatsapp: "+91 82971 11166",
  hours: "Monday – Saturday, 10:00 am – 6:00 pm IST",
  grievanceOfficer: "Sai Musunuru",
  jurisdiction: "Hyderabad, Telangana",
  legalUpdated: "12 October 2026",
} as const;

/** How members pay for a membership.
 *  - "manual": pay by UPI / bank transfer, WhatsApp the screenshot, staff
 *    activate the plan from the member desk (Grant plan).
 *  - "payu": online checkout through PayU (needs an approved merchant account).
 */
export const PAYMENT = {
  mode: "manual" as "manual" | "payu",
  // GPay / PhonePe number members pay to (shown as-is).
  upiPhone: "+91 82971 11166",
  // Exact UPI ID (e.g. "8297111166@ybl"). When set, the page also shows a QR
  // code and a tap-to-pay button with the amount filled in.
  upiId: "brahmamudi36-2@oksbi",
  upiName: "brahma mudi", // name the UPI ID is registered under (SBI a/c ending 7005)
  payeeName: "B. Srihari", // name behind the GPay / PhonePe number
  bank: {
    accountName: "B. Srihari",
    bankName: "ICICI Bank",
    branch: "Kalyan Nagar",
    accountNumber: "111101000600",
    ifsc: "ICIC0001111",
  },
  // WhatsApp number the payment screenshot goes to.
  whatsapp: "+91 82971 11166",
  activationTime: "within a few hours (Monday – Saturday)",
};

export const telHref = (n: string) => `tel:${n.replace(/\s/g, "")}`;
export const waHref = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;

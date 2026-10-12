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

export const telHref = (n: string) => `tel:${n.replace(/\s/g, "")}`;
export const waHref = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;

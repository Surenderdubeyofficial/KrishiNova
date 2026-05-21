export const adminContact = {
  name: "Surender Dubey",
  email: "surenderdubey9582@gmail.com",
  mobile: "9582514339",
  address: "Delhi, Karol Bagh",
};

export function withAdminContact(admin) {
  if (!admin) return admin;
  return {
    ...admin,
    contact_name: adminContact.name,
    contact_email: adminContact.email,
    contact_mobile: adminContact.mobile,
    contact_address: adminContact.address,
  };
}

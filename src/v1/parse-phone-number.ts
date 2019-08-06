import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

export const normalizePhoneNumber = (phoneNumber: string) =>
	phoneNumber.replace(/[^+\d]/g, "");

export const parsePhoneNumber = (phoneNumber: string) => {
	try {
		return {
			e164: normalizePhoneNumber(
				phoneUtil.format(
					phoneUtil.parse(`+${phoneNumber}`),
					PhoneNumberFormat.INTERNATIONAL
				)
			),
			localized: phoneUtil.format(
				phoneUtil.parse(`+${phoneNumber}`),
				PhoneNumberFormat.NATIONAL
			)
		};
	} catch (error) {
		return {
			e164: phoneNumber,
			localized: phoneNumber
		};
	}
};

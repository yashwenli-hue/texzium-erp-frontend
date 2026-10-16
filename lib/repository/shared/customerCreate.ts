import type { Customer, CustomerGstRegistration } from "../../types/domain";
import type { CreateCustomerInput, CreateGstRegistrationInput } from "../interfaces";

/**
 * Creating a customer and, optionally, its first GST registration. With a registration the
 * backend now creates both in ONE request and transaction (POST /customers with
 * gstRegistration): either both exist or neither does, so "partial" no longer happens on a
 * current backend. The outcomes stay as they were for the screens:
 *
 *  - "failed":  the customer was NOT created (a duplicate, a validation error, no
 *               permission). Nothing exists; the person fixes the details and tries again.
 *  - "done":    the customer exists, and so does the registration if one was given.
 *  - "partial": the customer EXISTS but its registration was not saved. The customer is
 *               kept and handed back; the registration alone can be retried, and the
 *               customer is never created a second time.
 *
 * Both calls are passed in, so this is pure sequencing and is tested without a screen.
 */
export type RegistrationInput = Omit<CreateGstRegistrationInput, "customerId">;

export type CreateOutcome =
  | { kind: "failed"; error: Error }
  | { kind: "done"; customer: Customer; registration?: CustomerGstRegistration }
  | { kind: "partial"; customer: Customer; registrationError: Error };

export type RetryOutcome = { kind: "done"; registration: CustomerGstRegistration } | { kind: "failed"; error: Error };

const asError = (e: unknown, fallback: string) => (e instanceof Error ? e : new Error(fallback));

export async function createCustomerThenRegistration(
  api: {
    createCustomer: (input: CreateCustomerInput) => Promise<Customer>;
    addRegistration: (customerId: string, input: RegistrationInput) => Promise<CustomerGstRegistration>;
  },
  details: CreateCustomerInput,
  registration: RegistrationInput | null
): Promise<CreateOutcome> {
  try {
    if (!registration) return { kind: "done", customer: await api.createCustomer(details) };
    const { isDefault: _ignored, ...first } = registration;
    void _ignored;
    const customer = await api.createCustomer({ ...details, gstRegistration: first });
    return { kind: "done", customer, registration: customer.gstRegistrations.find((g) => g.gstin === first.gstin) };
  } catch (e) {
    // Nothing was created: the customer and its registration go together.
    return { kind: "failed", error: asError(e, "The customer could not be created.") };
  }
}

/** Retries only the registration, for a customer that already exists. It cannot create a customer. */
export async function retryRegistration(
  api: { addRegistration: (customerId: string, input: RegistrationInput) => Promise<CustomerGstRegistration> },
  customerId: string,
  registration: RegistrationInput
): Promise<RetryOutcome> {
  try {
    return { kind: "done", registration: await api.addRegistration(customerId, registration) };
  } catch (e) {
    return { kind: "failed", error: asError(e, "The registration could not be saved.") };
  }
}

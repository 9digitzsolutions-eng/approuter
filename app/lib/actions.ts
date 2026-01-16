'use server';

import z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";

import { signIn } from "../auth";
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: true });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer',
  }),
  amount: z.coerce
  .number()
  .gt(0, { 
    message: 'Please enter an amount greater than $0.' 
    }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
    // Validación usando Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // Si la validación falla devuelve un error, si no, continua
    if (!validatedFields.success) {
        return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    // Insertar datos en la BBDD
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        // Si un error ocurre, devolvemos un mensaje más claro
        return { message: "Database Error: Failed to Create Invoice." };
    }
    
    // Revalidamos la cache de la página de React y redirigimos al usuario para actualizar
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    // Validación usando Zod
    const validateFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validateFields.success) {
        return {
            errors: validateFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Invoice.",
        }
    }

    const { customerId, amount, status } = validateFields.data;
    const amountInCents = amount * 100;

    try {
        await sql `
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
        `;
    } catch (error) {
        console.log(error);
        return { message: "Database Error: Failed to Update Invoice." };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delete Invoice');

    await sql `DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
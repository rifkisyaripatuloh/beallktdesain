import { NextResponse } from "next/server";

export function success<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json({ success: true, message, data, meta: null }, { status });
}

export function failure(message: string, status = 500, errors?: unknown) {
  return NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status });
}

export function validationFailure(error: { flatten: () => unknown }) {
  return failure("Validasi gagal", 422, error.flatten());
}


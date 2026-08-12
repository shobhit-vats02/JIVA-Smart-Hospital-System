/**
 * Standardised API response helpers.
 * Every controller returns one of these shapes so the client can rely on a
 * consistent contract: { success, data?, message?, errors? }
 */

export function success(res, data, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created(res, data, message = 'Created successfully', status = 201) {
  return res.status(status).json({ success: true, data, message });
}

export function failure(res, message = 'Something went wrong', status = 400, errors = undefined) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

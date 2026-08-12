import Department from '../models/Department.js';
import Doctor from '../models/Doctor.js';

/** List all active departments. */
export async function listDepartments() {
  return Department.find({ isActive: true }).sort({ name: 1 }).exec();
}

/**
 * List doctors for a department, with availability + presence included.
 * When no department given, lists all active doctors.
 */
export async function listDoctors(departmentId) {
  const query = { isActive: true };
  if (departmentId) query.department = departmentId;
  return Doctor.find(query)
    .populate('department')
    .sort({ name: 1 })
    .exec();
}

export const departmentService = { listDepartments, listDoctors };

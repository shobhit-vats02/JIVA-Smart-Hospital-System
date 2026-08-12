import { departmentService } from '../services/department.service.js';
import { success } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

export const listDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.listDepartments();
  return success(res, departments, 'Departments retrieved');
});

export const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await departmentService.listDoctors(req.query.departmentId);
  return success(res, doctors, 'Doctors retrieved');
});

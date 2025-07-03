// This file is deprecated - use prismaUserActions.ts instead
// Keeping for backward compatibility during migration

export { 
  getAllUsersAction,
  getUserByIdAction, 
  getUserByEmailAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  updateUserLastLoginAction
} from "./prismaUserActions";
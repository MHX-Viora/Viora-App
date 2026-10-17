"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDeveloperAccount = isDeveloperAccount;
function isDeveloperAccount(value) {
    if (!value || typeof value !== "object")
        return false;
    const a = value;
    return typeof a.id === "string" && typeof a.fullName === "string" && typeof a.email === "string" && a.status === "Active" && typeof a.emailVerifiedAt === "string" && typeof a.hasPassword === "boolean";
}

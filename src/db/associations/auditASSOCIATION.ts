import { AuditItem, AuditSession } from '../entities';

export const auditAssociations = () => {
  AuditItem.belongsTo(AuditSession, {
    foreignKey: 'audit_session_id',
    as: 'auditSession',
  });

  AuditSession.hasMany(AuditItem, {
    foreignKey: 'audit_session_id',
    as: 'auditItems',
  });
};

import { Button, EmptyState } from "../ui/Button";
import { DocumentAction, DocumentActions } from "../ui/DocumentActions";
import { Icon } from "../ui/Icon";
import { Tag } from "../ui/Tag";
import { gstActions } from "../../lib/repository/shared/customerLifecycle";
import type { ActionState } from "../../lib/repository/shared/quotationLifecycle";
import type { Customer, CustomerGstRegistration } from "../../lib/types/domain";

const LOCK_ID = "gst-lock-note"; // one per page

function RegistrationRow({
  reg,
  customer,
  otherActive,
  may,
  lock,
  onEdit,
  onDeactivate,
  onReactivate,
  onMakeDefault,
}: {
  reg: CustomerGstRegistration;
  customer: Customer;
  otherActive: number;
  may: { gstManage: boolean };
  /** The reason every row is locked for, written once above the list. */
  lock?: { id: string; text: string };
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onMakeDefault: () => void;
}) {
  const a = gstActions(reg, { customerActive: customer.isActive, may, otherActiveCount: otherActive });
  const rowActions: DocumentAction[] = [
    { key: "edit", label: "Edit", state: a.edit, onClick: onEdit },
    ...(reg.isActive && !reg.isDefault ? [{ key: "makeDefault", label: "Make default", state: a.makeDefault, onClick: onMakeDefault }] : []),
    reg.isActive
      ? { key: "deactivate", label: "Deactivate", className: "danger-ghost", state: a.deactivate, onClick: onDeactivate }
      : { key: "reactivate", label: "Reactivate", state: a.reactivate, onClick: onReactivate },
  ];
  return (
    <li className={`reg ${reg.isActive ? "" : "inactive"}`} data-testid="gst-row" data-gstin={reg.gstin}>
      <div>
        <div className="gstin">{reg.gstin}</div>
        <div className="sub">
          {reg.legalName}
          {reg.branchName ? ` · ${reg.branchName}` : ""}
        </div>
        <div className="tags">
          {reg.isDefault && reg.isActive && <Tag color="g">Default</Tag>}
          <Tag color={reg.isActive ? "n" : "b"}>{reg.isActive ? "Active" : "Inactive"}</Tag>
          <Tag color="i">{reg.stateName}</Tag>
        </div>
      </div>
      <div className="sub" style={{ marginTop: 0 }}>
        {reg.addressLine1}
        {reg.addressLine2 ? `, ${reg.addressLine2}` : ""}
        <br />
        {reg.city} {reg.pincode}
      </div>
      <DocumentActions size="sm" actions={rowActions} sharedReason={lock} testId="gst-row-actions" />
    </li>
  );
}

/**
 * The customer's GST registrations: the ones a quotation can use. The panel says once,
 * above the list, when every registration is locked (the customer is inactive, or the
 * user may not manage them), and each row's buttons point at that sentence. It is a
 * column of the page's right rail, so its rows stack when they are narrow (by their own
 * width, not the screen's).
 */
export function GstRegistrationsPanel({
  customer,
  registrations,
  may,
  addState,
  onAdd,
  onEdit,
  onDeactivate,
  onReactivate,
  onMakeDefault,
}: {
  customer: Customer;
  registrations: CustomerGstRegistration[];
  may: { gstManage: boolean };
  addState: ActionState;
  onAdd: () => void;
  onEdit: (reg: CustomerGstRegistration) => void;
  onDeactivate: (reg: CustomerGstRegistration) => void;
  onReactivate: (reg: CustomerGstRegistration) => void;
  onMakeDefault: (reg: CustomerGstRegistration) => void;
}) {
  const lock = !addState.enabled && addState.reason ? { id: LOCK_ID, text: addState.reason } : undefined;
  return (
    <section className="card panel reg-panel" id="gst" aria-labelledby="gst-title" data-testid="gst-panel">
      <div className="panel-head">
        <h3 id="gst-title">GST registrations</h3>
        <span className="panel-act">
          <Button className="sm" icon="plus" onClick={onAdd} disabled={!addState.enabled} aria-describedby={lock?.id}>
            Add registration
          </Button>
        </span>
      </div>
      {lock && (
        <p className="lock-note" id={lock.id} data-testid="gst-lock">
          <Icon name="alert" size={14} />
          <span>
            <b>Registrations are read-only.</b> {lock.text}
          </span>
        </p>
      )}
      {registrations.length === 0 ? (
        <EmptyState icon="percent" title="No GST registrations" body="A quotation needs the buyer's GST registration. Add the first one — it becomes the default." />
      ) : (
        <ul className="reg-list" aria-label="GST registrations" data-testid="gst-list">
          {registrations.map((g) => (
            <RegistrationRow
              key={g.id}
              reg={g}
              customer={customer}
              otherActive={registrations.filter((x) => x.isActive && x.id !== g.id).length}
              may={may}
              lock={lock}
              onEdit={() => onEdit(g)}
              onDeactivate={() => onDeactivate(g)}
              onReactivate={() => onReactivate(g)}
              onMakeDefault={() => onMakeDefault(g)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

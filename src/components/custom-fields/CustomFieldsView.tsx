"use client";

import React, { useState, useEffect } from "react";
import { ICustomFieldDefinition } from "@/types";
import { Sliders, Plus, Trash2, CheckCircle2, Layers } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";

export function CustomFieldsView() {
  const [fields, setFields] = useState<ICustomFieldDefinition[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("Product");

  const [formEntity, setFormEntity] = useState<ICustomFieldDefinition["entityType"]>("Product");
  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<ICustomFieldDefinition["fieldType"]>("text");
  const [fieldOptions, setFieldOptions] = useState("");

  const fetchFields = async () => {
    try {
      const res = await fetch("/api/custom-fields");
      const data = await res.json();
      if (res.ok) setFields(data.fields || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleCreateField = async () => {
    if (!fieldName || !fieldLabel) {
      toast.error("Field name and label are required.");
      return;
    }

    try {
      const optionsArray =
        fieldType === "dropdown" ? fieldOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: formEntity,
          fieldName: fieldName.trim().replace(/\s+/g, ""),
          fieldLabel: fieldLabel.trim(),
          fieldType,
          options: optionsArray,
          order: fields.length + 1,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Custom field added successfully!");
      setShowAddModal(false);
      setFieldName("");
      setFieldLabel("");
      setFieldOptions("");
      fetchFields();
    } catch (err: any) {
      toast.error(err.message || "Failed to create field");
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm("Remove this custom field?")) return;
    try {
      const res = await fetch(`/api/custom-fields?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Field removed.");
        fetchFields();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredFields = selectedEntity === "All" ? fields : fields.filter((f) => f.entityType === selectedEntity);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" /> Dynamic Custom Fields & Customization
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Extend Products, Customers, Sales, Purchases, and Expenses with custom fields without modifying code
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Custom Field
        </button>
      </div>

      {/* Entity Selector Tabs */}
      <div className="flex gap-2 my-4 text-xs overflow-x-auto pb-1">
        {["All", "Product", "Customer", "Sale", "Purchase", "Supplier", "Expense"].map((ent) => (
          <button
            key={ent}
            onClick={() => setSelectedEntity(ent)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedEntity === ent
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {ent} Fields
          </button>
        ))}
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Entity</th>
              <th className="py-3 px-3">Field Label</th>
              <th className="py-3 px-3">Field Identifier</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Options (Dropdown)</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFields.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  No custom fields defined for this section yet.
                </td>
              </tr>
            ) : (
              filteredFields.map((f) => (
                <tr key={f._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                      {f.entityType}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{f.fieldLabel}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{f.fieldName}</td>
                  <td className="py-3 px-3">
                    <span className="capitalize font-medium text-slate-600 dark:text-slate-400">
                      {f.fieldType}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {f.options && f.options.length > 0 ? f.options.join(", ") : "-"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteField(f._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Add Custom Field */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Dynamic Custom Field"
        subtitle="This field will appear in the specified module forms and records"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Attach Field To *
            </label>
            <select
              value={formEntity}
              onChange={(e) => setFormEntity(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="Product">Product (e.g. Warranty, Brand Grade)</option>
              <option value="Customer">Customer (e.g. CNIC Number, NTN)</option>
              <option value="Sale">Sale Invoice (e.g. Salesman Name)</option>
              <option value="Purchase">Purchase (e.g. Cargo Waybill #)</option>
              <option value="Supplier">Supplier (e.g. Bank Account)</option>
              <option value="Expense">Expense (e.g. Voucher Number)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Field Label (User Facing) *
            </label>
            <input
              type="text"
              value={fieldLabel}
              onChange={(e) => {
                setFieldLabel(e.target.value);
                if (!fieldName) {
                  setFieldName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                }
              }}
              placeholder="e.g. Warranty Days or CNIC Number"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Field Key / Code *
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g. warrantyDays"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Field Type *
            </label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="text">Text (Single Line)</option>
              <option value="number">Number</option>
              <option value="currency">Currency (PKR)</option>
              <option value="dropdown">Dropdown Options</option>
              <option value="textarea">Multi-line Text</option>
              <option value="date">Date</option>
              <option value="boolean">Yes / No Switch</option>
            </select>
          </div>

          {fieldType === "dropdown" && (
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Dropdown Options (Comma separated) *
              </label>
              <input
                type="text"
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          )}

          <button
            onClick={handleCreateField}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Create Dynamic Field
          </button>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/job";
import { ImageUploadField } from "@/components/ImageUploadField";
import { TagMultiSelect } from "@/components/TagMultiSelect";
import {
  AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVELS,
  PROJECT_TYPES,
  SKILLS,
} from "@/lib/taxonomy";
import { US_STATES } from "@/lib/us-states";

type JobFormValues = {
  title: string;
  description: string;
  budget: string;
  city: string;
  state: string;
  requiredSkills: string[];
  projectType: string;
  experienceLevel: string;
  availabilityNeeded: string;
  imageUrls: string[];
};

type JobFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  jobId?: string;
  defaultValues?: JobFormValues;
};

const emptyValues: JobFormValues = {
  title: "",
  description: "",
  budget: "",
  city: "",
  state: "",
  requiredSkills: [],
  projectType: "",
  experienceLevel: "any",
  availabilityNeeded: "",
  imageUrls: [],
};

const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900";

export function JobForm({ action, submitLabel, jobId, defaultValues = emptyValues }: JobFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Title</span>
        <input name="title" required maxLength={120} defaultValue={defaultValues.title} className={fieldClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Project type</span>
        <select
          name="projectType"
          required
          defaultValue={defaultValues.projectType}
          className={fieldClass}
        >
          <option value="">Select a project type</option>
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <TagMultiSelect
        name="requiredSkills"
        label="Required skills"
        options={SKILLS}
        defaultSelected={defaultValues.requiredSkills}
        helpText="Use the same skill list contractors pick from so matches stay accurate."
      />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Description</span>
        <textarea
          name="description"
          required
          rows={5}
          maxLength={5000}
          defaultValue={defaultValues.description}
          className={fieldClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Budget (USD)</span>
          <input
            name="budget"
            type="number"
            required
            min={0.01}
            max={1000000}
            step={0.01}
            defaultValue={defaultValues.budget}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">City</span>
          <input
            name="city"
            required
            maxLength={80}
            placeholder="e.g. Rockville"
            defaultValue={defaultValues.city}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">State</span>
          <select name="state" required defaultValue={defaultValues.state} className={fieldClass}>
            <option value="">Select a state</option>
            {US_STATES.map((stateOption) => (
              <option key={stateOption.code} value={stateOption.code}>
                {stateOption.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Needed availability</span>
          <select
            name="availabilityNeeded"
            defaultValue={defaultValues.availabilityNeeded}
            className={fieldClass}
          >
            <option value="">No preference</option>
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Experience level</span>
          <select
            name="experienceLevel"
            required
            defaultValue={defaultValues.experienceLevel}
            className={fieldClass}
          >
            {EXPERIENCE_LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ImageUploadField
        name="imageUrls"
        label="Job photos (optional)"
        folder="jobs"
        maxFiles={8}
        defaultUrls={defaultValues.imageUrls}
        helpText="JPEG, PNG, WebP, or GIF up to 5 MB each. Stored on Vercel Blob."
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

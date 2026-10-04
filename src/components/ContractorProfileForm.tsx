"use client";

import { useActionState } from "react";
import type { ProfileFormState } from "@/lib/actions/contractor-profile";
import { ImageUploadField } from "@/components/ImageUploadField";
import { TagMultiSelect } from "@/components/TagMultiSelect";
import {
  AVAILABILITY_OPTIONS,
  SERVICE_CATEGORIES,
  SKILLS,
  TRADES,
} from "@/lib/taxonomy";
import { US_STATES } from "@/lib/us-states";

type ProfileFormValues = {
  companyName: string;
  trade: string;
  bio: string;
  city: string;
  state: string;
  yearsExperience: string;
  hourlyRate: string;
  skills: string[];
  serviceCategories: string[];
  serviceRadiusMiles: string;
  availability: string;
  availabilityNotes: string;
  profileImage: string;
  portfolioImages: string[];
};

type ContractorProfileFormProps = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  submitLabel: string;
  defaultValues?: ProfileFormValues;
};

const emptyValues: ProfileFormValues = {
  companyName: "",
  trade: "",
  bio: "",
  city: "",
  state: "",
  yearsExperience: "",
  hourlyRate: "",
  skills: [],
  serviceCategories: [],
  serviceRadiusMiles: "25",
  availability: "flexible",
  availabilityNotes: "",
  profileImage: "",
  portfolioImages: [],
};

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900";

export function ContractorProfileForm({
  action,
  submitLabel,
  defaultValues = emptyValues,
}: ContractorProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Company name</span>
        <input
          name="companyName"
          required
          maxLength={100}
          defaultValue={defaultValues.companyName}
          className={fieldClass}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Trade</span>
        <select name="trade" required defaultValue={defaultValues.trade} className={fieldClass}>
          <option value="">Select a trade</option>
          {TRADES.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </select>
      </label>

      <TagMultiSelect
        name="skills"
        label="Skills"
        options={SKILLS}
        defaultSelected={defaultValues.skills}
        helpText="Search and select standardized skills so matching stays consistent."
      />

      <TagMultiSelect
        name="serviceCategories"
        label="Service categories"
        options={SERVICE_CATEGORIES}
        defaultSelected={defaultValues.serviceCategories}
        helpText="Choose the kinds of projects you take on."
      />

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Bio</span>
        <textarea
          name="bio"
          required
          rows={5}
          maxLength={2000}
          defaultValue={defaultValues.bio}
          className={fieldClass}
        />
      </label>

      <ImageUploadField
        name="profileImage"
        label="Profile picture (optional)"
        folder="profiles"
        maxFiles={1}
        defaultUrls={defaultValues.profileImage ? [defaultValues.profileImage] : []}
        helpText="JPEG, PNG, WebP, or GIF up to 5 MB. Stored on Vercel Blob."
      />

      <ImageUploadField
        name="portfolioImages"
        label="Portfolio / previous job photos"
        folder="portfolio"
        maxFiles={12}
        defaultUrls={defaultValues.portfolioImages}
        helpText="Up to 12 photos. JPEG, PNG, WebP, or GIF up to 5 MB each."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">City</span>
          <input name="city" required maxLength={80} defaultValue={defaultValues.city} className={fieldClass} />
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

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Years of experience</span>
          <input
            name="yearsExperience"
            type="number"
            required
            min={0}
            max={80}
            step={1}
            defaultValue={defaultValues.yearsExperience}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Hourly rate (USD)</span>
          <input
            name="hourlyRate"
            type="number"
            required
            min={0.01}
            max={10000}
            step={0.01}
            defaultValue={defaultValues.hourlyRate}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Service radius (miles)</span>
          <input
            name="serviceRadiusMiles"
            type="number"
            required
            min={1}
            max={500}
            step={1}
            defaultValue={defaultValues.serviceRadiusMiles}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Availability</span>
        <select
          name="availability"
          required
          defaultValue={defaultValues.availability}
          className={fieldClass}
        >
          {AVAILABILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Availability notes (optional)</span>
        <textarea
          name="availabilityNotes"
          rows={2}
          maxLength={500}
          placeholder="Extra scheduling details"
          defaultValue={defaultValues.availabilityNotes}
          className={fieldClass}
        />
      </label>

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

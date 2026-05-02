"use client";

export function SafetyBanner() {
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            Sending is irreversible
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            Review the invitation carefully before sending. Once sent, this
            email cannot be recalled. Ensure the tone is appropriate and all
            details are correct.
          </p>
        </div>
      </div>
    </div>
  );
}

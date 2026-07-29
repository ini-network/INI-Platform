"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type RefObject
} from "react";
import { createPortal } from "react-dom";

import { useVisualViewport } from "@/lib/map-feature/use-visual-viewport";
import styles from "./coverage-request-dialog.module.css";

export type CoverageRequestArea = {
  id: number;
  name: string;
  borough: string;
};

type CoverageRequestDialogProps = {
  area: CoverageRequestArea;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

type FieldName = "fullName" | "topic" | "summary";
type DialogScreen = "form" | "discard" | "success";
type FieldElement = HTMLInputElement | HTMLTextAreaElement;

type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, string>>;

const MIN_LENGTHS: Record<FieldName, number> = {
  fullName: 2,
  topic: 5,
  summary: 20
};

const EMPTY_VALUES: FormValues = {
  fullName: "",
  topic: "",
  summary: ""
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

let coverageDialogNonce = 0;
let scrollLockCount = 0;
let previousBodyOverflow = "";

function subscribeToHydration() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function acquireBodyScrollLock() {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function releaseBodyScrollLock() {
  scrollLockCount -= 1;
  if (scrollLockCount <= 0) {
    scrollLockCount = 0;
    document.body.style.overflow = previousBodyOverflow;
  }
}

function validationMessage(name: FieldName, field: FieldElement): string {
  const trimmedLength = field.value.trim().length;

  if (field.validity.valueMissing || trimmedLength === 0) {
    if (name === "fullName") return "Enter your full name.";
    if (name === "topic") return "Enter the topic you want INI to cover.";
    return "Add a short summary of what is happening.";
  }

  if (field.validity.tooShort || trimmedLength < MIN_LENGTHS[name]) {
    if (name === "fullName") return "Use at least 2 characters for your name.";
    if (name === "topic") return "Use at least 5 characters for the topic.";
    return "Use at least 20 characters so the team has enough context.";
  }

  if (field.validity.tooLong) {
    if (name === "fullName") return "Keep your name to 80 characters or fewer.";
    if (name === "topic") return "Keep the topic to 100 characters or fewer.";
    return "Keep the summary to 500 characters or fewer.";
  }

  return "Check this field and try again.";
}

function fieldIsValid(name: FieldName, field: FieldElement): boolean {
  return field.validity.valid && field.value.trim().length >= MIN_LENGTHS[name];
}

function focusInvalidField(field: FieldElement) {
  const restoreFocus = () => {
    if (!field.isConnected || document.activeElement === field) return;
    field.focus({ preventScroll: false });
  };

  field.focus({ preventScroll: false });
  window.requestAnimationFrame(() => {
    // Some mobile browsers return focus to the tapped submit button after the
    // submit handler. Correct that after the click finishes without relying on
    // a stale ref or changing the field under the user's finger.
    restoreFocus();
  });
}

function visibleFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      !element.hasAttribute("hidden") &&
      element.getClientRects().length > 0
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6.5 12.3 3.5 3.5 7.8-8" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3.5 21 19H3l9-15.5Z" />
      <path d="M12 9v4.5M12 17v.1" />
    </svg>
  );
}

export function CoverageRequestDialog({
  area,
  onClose,
  returnFocusRef
}: CoverageRequestDialogProps) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot
  );
  const idPrefix = useId();
  const visualViewport = useVisualViewport();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [screen, setScreen] = useState<DialogScreen>("form");

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const lastFieldNameRef = useRef<FieldName>("fullName");
  const openerRef = useRef<HTMLElement | null>(null);
  const openerCapturedRef = useRef(false);
  const pressedOnBackdropRef = useRef(false);
  const initializedHistoryRef = useRef(false);
  const historyNonceRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const dirtyRef = useRef(false);
  const screenRef = useRef<DialogScreen>(screen);
  const onCloseRef = useRef(onClose);

  const dirty = Object.values(values).some((value) => value.length > 0);
  dirtyRef.current = dirty;
  screenRef.current = screen;
  onCloseRef.current = onClose;

  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const fullNameId = `${idPrefix}-full-name`;
  const topicId = `${idPrefix}-topic`;
  const topicHintId = `${idPrefix}-topic-hint`;
  const summaryId = `${idPrefix}-summary`;
  const summaryHintId = `${idPrefix}-summary-hint`;

  const pushHistorySentinel = useCallback(() => {
    if (typeof window === "undefined") return;

    const nonce = historyNonceRef.current ?? ++coverageDialogNonce;
    historyNonceRef.current = nonce;
    const nextState = {
      ...window.history.state,
      __coverageRequestDialog: true,
      __coverageRequestDialogNonce: nonce
    };

    if (window.history.state?.__coverageRequestDialog) {
      window.history.replaceState(nextState, "", window.location.href);
    } else {
      window.history.pushState(nextState, "", window.location.href);
    }
  }, []);

  const finishClose = useCallback((historyWasPopped = false) => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (!historyWasPopped) {
      const nonce = historyNonceRef.current;
      window.setTimeout(() => {
        if (nonce != null && window.history.state?.__coverageRequestDialogNonce === nonce) {
          window.history.back();
        }
      }, 0);
    }

    onCloseRef.current();
  }, []);

  const requestClose = useCallback(() => {
    if (screen === "form" && dirty) {
      setScreen("discard");
      return;
    }

    finishClose();
  }, [dirty, finishClose, screen]);

  const keepEditing = useCallback(() => {
    setScreen("form");
  }, []);

  const keepFieldAboveKeyboard = useCallback(
    (field: FieldElement | null) => {
      const scroller = scrollRegionRef.current;
      if (!field?.isConnected || !scroller) return;

      const viewportHeight = visualViewport.height || window.innerHeight;
      const maxViewportOffset = Math.max(0, window.innerHeight - viewportHeight);
      const viewportTop = Math.min(
        Math.max(visualViewport.offsetTop, 0),
        maxViewportOffset
      );
      const visibleTop = viewportTop + 16;
      const visibleBottom = viewportTop + viewportHeight - 16;
      const fieldRect = field.getBoundingClientRect();

      if (fieldRect.bottom > visibleBottom) {
        scroller.scrollTop += fieldRect.bottom - visibleBottom;
      } else if (fieldRect.top < visibleTop) {
        scroller.scrollTop += fieldRect.top - visibleTop;
      }
    },
    [visualViewport.height, visualViewport.offsetTop]
  );

  function handleFieldFocus(name: FieldName, event: FocusEvent<FieldElement>) {
    lastFieldNameRef.current = name;
    const field = event.currentTarget;
    window.requestAnimationFrame(() => keepFieldAboveKeyboard(field));
  }

  useEffect(() => {
    if (!hydrated) return;

    acquireBodyScrollLock();
    return () => releaseBodyScrollLock();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== overlay && !element.contains(overlay)
    );
    const previousStates = siblings.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden")
    }));
    const mapLayers = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".mapboxgl-canvas, .mapboxgl-control-container"
      )
    );
    const previousMapVisibility = mapLayers.map((element) => ({
      element,
      visibility: element.style.visibility
    }));

    for (const element of siblings) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    // iOS Safari can composite Mapbox's accelerated canvas above an otherwise
    // opaque portal for a frame, leaving the north marker visible through the
    // dialog. Preserve the map's layout but hide its composited layers while
    // this modal owns the screen.
    for (const element of mapLayers) {
      element.style.visibility = "hidden";
    }

    return () => {
      for (const { element, inert, ariaHidden } of previousStates) {
        if (!element.isConnected) continue;
        element.inert = inert;
        if (ariaHidden == null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      for (const { element, visibility } of previousMapVisibility) {
        if (element.isConnected) element.style.visibility = visibility;
      }
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    function onPopState() {
      if (closingRef.current) return;

      if (dirtyRef.current && screenRef.current === "form") {
        pushHistorySentinel();
        setScreen("discard");
        return;
      }

      finishClose(true);
    }

    window.addEventListener("popstate", onPopState);
    if (!initializedHistoryRef.current) {
      initializedHistoryRef.current = true;
      pushHistorySentinel();
    }

    return () => window.removeEventListener("popstate", onPopState);
  }, [finishClose, hydrated, pushHistorySentinel]);

  useEffect(() => {
    if (!hydrated) return;

    function onKeyDown(event: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (screenRef.current === "discard") keepEditing();
        else requestClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusables = visibleFocusables(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [hydrated, keepEditing, requestClose]);

  useEffect(() => {
    if (!hydrated) return;

    const explicitReturnTarget = returnFocusRef?.current ?? null;

    if (!openerCapturedRef.current) {
      openerCapturedRef.current = true;
      openerRef.current = explicitReturnTarget ?? (document.activeElement as HTMLElement | null);
    }

    return () => {
      const target = explicitReturnTarget ?? openerRef.current;
      if (target && target.isConnected) target.focus({ preventScroll: true });
    };
  }, [hydrated, returnFocusRef]);

  useEffect(() => {
    if (!hydrated) return;

    if (screen === "form") {
      const activeField = document.activeElement;
      if (
        activeField instanceof HTMLInputElement ||
        activeField instanceof HTMLTextAreaElement
      ) {
        const frame = window.requestAnimationFrame(() =>
          keepFieldAboveKeyboard(activeField)
        );
        return () => window.cancelAnimationFrame(frame);
      }
    }
  }, [
    hydrated,
    keepFieldAboveKeyboard,
    screen,
    visualViewport.height,
    visualViewport.offsetTop
  ]);

  useEffect(() => {
    if (!hydrated) return;

    if (screen === "success") {
      scrollRegionRef.current?.scrollTo({ top: 0 });
      successHeadingRef.current?.focus({ preventScroll: true });
    } else if (screen === "discard") {
      scrollRegionRef.current?.scrollTo({ top: 0 });
      keepEditingRef.current?.focus({ preventScroll: true });
    } else {
      const target =
        lastFieldNameRef.current === "topic"
          ? topicRef.current
          : lastFieldNameRef.current === "summary"
            ? summaryRef.current
            : fullNameRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [hydrated, screen]);

  function handleChange(name: FieldName, event: ChangeEvent<FieldElement>) {
    const nextValue = event.currentTarget.value;
    const field = event.currentTarget;
    setValues((current) => ({ ...current, [name]: nextValue }));

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: fieldIsValid(name, field) ? undefined : validationMessage(name, field)
      }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    let firstInvalid: FieldElement | null = null;

    for (const name of ["fullName", "topic", "summary"] as const) {
      const field = event.currentTarget.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
        continue;
      }
      if (!fieldIsValid(name, field)) {
        nextErrors[name] = validationMessage(name, field);
        firstInvalid ??= field;
      }
    }

    if (firstInvalid) {
      setErrors(nextErrors);
      // Keep this inside the submit gesture so iOS is allowed to reopen the
      // keyboard for the first invalid field.
      focusInvalidField(firstInvalid);
      return;
    }

    /* Intentional prototype boundary: no network or storage. The backend owner
       can replace this transition with their authenticated request adapter and
       remove fullName once account identity is the source of truth. */
    setErrors({});
    setScreen("success");
  }

  const form = (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor={fullNameId}>
          Full name
        </label>
        <input
          ref={fullNameRef}
          id={fullNameId}
          name="fullName"
          type="text"
          className={styles.input}
          value={values.fullName}
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? `${fullNameId}-error` : undefined}
          aria-errormessage={errors.fullName ? `${fullNameId}-error` : undefined}
          onFocus={(event) => handleFieldFocus("fullName", event)}
          onChange={(event) => handleChange("fullName", event)}
        />
        {errors.fullName ? (
          <p className={styles.error} id={`${fullNameId}-error`} role="alert">
            {errors.fullName}
          </p>
        ) : null}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor={topicId}>
          What should we cover?
        </label>
        <input
          ref={topicRef}
          id={topicId}
          name="topic"
          type="text"
          className={styles.input}
          value={values.topic}
          minLength={5}
          maxLength={100}
          required
          aria-invalid={Boolean(errors.topic)}
          aria-describedby={`${topicHintId}${errors.topic ? ` ${topicId}-error` : ""}`}
          aria-errormessage={errors.topic ? `${topicId}-error` : undefined}
          onFocus={(event) => handleFieldFocus("topic", event)}
          onChange={(event) => handleChange("topic", event)}
        />
        <p className={styles.hint} id={topicHintId}>
          Be specific, such as “Unsafe intersection near Avenue J.”
        </p>
        {errors.topic ? (
          <p className={styles.error} id={`${topicId}-error`} role="alert">
            {errors.topic}
          </p>
        ) : null}
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={summaryId}>
            Tell us what&apos;s happening
          </label>
          <span className={styles.counter} id={`${summaryId}-counter`}>
            {values.summary.length}/500
          </span>
        </div>
        <textarea
          ref={summaryRef}
          id={summaryId}
          name="summary"
          className={`${styles.input} ${styles.textarea}`}
          value={values.summary}
          minLength={20}
          maxLength={500}
          rows={5}
          required
          aria-invalid={Boolean(errors.summary)}
          aria-describedby={`${summaryHintId} ${summaryId}-counter${errors.summary ? ` ${summaryId}-error` : ""}`}
          aria-errormessage={errors.summary ? `${summaryId}-error` : undefined}
          onFocus={(event) => handleFieldFocus("summary", event)}
          onChange={(event) => handleChange("summary", event)}
        />
        <p className={styles.hint} id={summaryHintId}>
          Include what is happening, who is affected, and why it deserves attention.
        </p>
        {errors.summary ? (
          <p className={styles.error} id={`${summaryId}-error`} role="alert">
            {errors.summary}
          </p>
        ) : null}
      </div>

      <aside className={styles.safetyNote} aria-label="Privacy and emergency notice">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3.5 20 7v5.2c0 4.3-3.2 7.3-8 8.8-4.8-1.5-8-4.5-8-8.8V7l8-3.5Z" />
          <path d="M12 8v5M12 16.5v.1" />
        </svg>
        <p>
          Please don&apos;t include sensitive personal information. This form is not
          monitored for emergencies—call 911 if anyone is in immediate danger.
        </p>
      </aside>

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={requestClose}>
          Cancel
        </button>
        <button type="submit" className={styles.primaryButton}>
          Submit request
        </button>
      </div>
    </form>
  );

  const discard = (
    <section className={styles.state} aria-labelledby={`${idPrefix}-discard-title`}>
      <div className={styles.stateIconNeutral} aria-hidden="true">
        <WarningIcon />
      </div>
      <h2 id={`${idPrefix}-discard-title`}>Discard this request?</h2>
      <p>Your details have not been saved. Keep editing or discard them and close.</p>
      <div className={styles.stateActions}>
        <button
          ref={keepEditingRef}
          type="button"
          className={styles.primaryButton}
          onClick={keepEditing}
        >
          Keep editing
        </button>
        <button type="button" className={styles.dangerButton} onClick={() => finishClose()}>
          Discard request
        </button>
      </div>
    </section>
  );

  const success = (
    <section className={styles.state} aria-labelledby={`${idPrefix}-success-title`}>
      <div className={styles.successIcon} aria-hidden="true">
        <SuccessIcon />
      </div>
      <h2 ref={successHeadingRef} tabIndex={-1} id={`${idPrefix}-success-title`}>
        Request ready for preview
      </h2>
      <p className={styles.prototypeNotice} role="status">
        <strong>Prototype preview — no request was sent.</strong>
      </p>
      <p>
        In the finished version, INI will review requests for local relevance and may
        contact the requester if more details are needed.
      </p>
      <ol className={styles.processList}>
        <li>The team reviews the topic, location, and similar requests.</li>
        <li>Follow-up questions and updates use the reply method connected to the account.</li>
        <li>A request helps guide reporting, but does not guarantee coverage or publication.</li>
      </ol>
      <button type="button" className={styles.primaryButton} onClick={() => finishClose()}>
        Done
      </button>
    </section>
  );

  if (!hydrated) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      style={
        visualViewport.height > 0
          ? ({
              "--coverage-viewport-height": `${visualViewport.height}px`,
              "--coverage-keyboard-inset": `${visualViewport.bottomInset}px`
            } as CSSProperties)
          : undefined
      }
      onPointerDown={(event) => {
        pressedOnBackdropRef.current = event.target === event.currentTarget;
        event.stopPropagation();
      }}
      onClick={(event) => {
        const startedOnBackdrop = pressedOnBackdropRef.current;
        pressedOnBackdropRef.current = false;
        event.stopPropagation();
        if (startedOnBackdrop && event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          screen === "form"
            ? titleId
            : screen === "discard"
              ? `${idPrefix}-discard-title`
              : `${idPrefix}-success-title`
        }
        aria-describedby={screen === "form" ? descriptionId : undefined}
        data-area-id={area.id}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h2 id={titleId}>Request Real-time Insights</h2>
            <p id={descriptionId}>Tell INI what deserves closer local reporting.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close Request Real-time Insights dialog"
            onClick={requestClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className={styles.location} aria-label={`Selected neighborhood: ${area.name}, ${area.borough}`}>
          <LocationIcon />
          <span>
            <strong>{area.name}</strong>
            <small>{area.borough}</small>
          </span>
        </div>

        <div ref={scrollRegionRef} className={styles.scrollRegion}>
          {screen === "form" ? form : screen === "discard" ? discard : success}
        </div>
      </div>
    </div>,
    document.body
  );
}

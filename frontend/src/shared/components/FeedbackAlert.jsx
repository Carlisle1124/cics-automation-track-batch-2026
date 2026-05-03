import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/FeedbackAlert.css';

import { CheckCircleIcon, XCircleIcon, WarningIcon, InfoIcon } from '@phosphor-icons/react';

const iconMap = {
  success: (
    <CheckCircleIcon className="feedback-alert__icon" weight="bold" />
  ),
  error: (
    <XCircleIcon className="feedback-alert__icon" weight="bold" />
  ),
  warning: (
    <WarningIcon className="feedback-alert__icon" weight="bold" />
  ),
  info: (
    <InfoIcon className="feedback-alert__icon" weight="bold" />
  ),
};

export default function FeedbackAlert({
  isOpen,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  confirmText = 'OK',
  onConfirm,
  showCancel = false,
  cancelText = 'Cancel',
  onCancel,
  onClose,
  autoCloseDuration, // ms to auto-close (optional)
  footer, // Custom JSX footer
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [progressWidth, setProgressWidth] = useState(100);
  const closeTimerRef = useRef(null);
  const progressFrameRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = () => {
    if (onCloseRef.current) {
      onCloseRef.current();
    }
  };
  // Auto-close effect
  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (progressFrameRef.current) {
      cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }

    if (!isOpen || !autoCloseDuration) {
      setProgressWidth(100);
      return undefined;
    }

    setProgressKey((value) => value + 1);
    setProgressWidth(100);

    progressFrameRef.current = window.requestAnimationFrame(() => {
      setProgressWidth(0);
    });

    closeTimerRef.current = window.setTimeout(() => {
      handleClose?.();
    }, autoCloseDuration);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      if (progressFrameRef.current) {
        cancelAnimationFrame(progressFrameRef.current);
        progressFrameRef.current = null;
      }
    };
  }, [isOpen, autoCloseDuration]);

  // Animation lifecycle
  useEffect(() => {
    let timeoutId;

    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    if (shouldRender) {
      setIsClosing(true);
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      handleClose();
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      handleClose();
    }
  };

  const backdropClassName = [
    'feedback-alert__backdrop',
    isClosing ? 'feedback-alert__backdrop--closing' : 'feedback-alert__backdrop--opening',
  ].join(' ');

  const alertClassName = [
    'feedback-alert',
    `feedback-alert--${type}`,
    isClosing ? 'feedback-alert--closing' : 'feedback-alert--opening',
  ]
    .filter(Boolean)
    .join(' ');

  const progressBar = autoCloseDuration ? (
    <div className="feedback-alert__progress-track" aria-hidden="true">
      <div
        key={progressKey}
        className="feedback-alert__progress-bar"
        style={{ transitionDuration: `${autoCloseDuration}ms`, width: `${progressWidth}%` }}
      />
    </div>
  ) : null;

  return createPortal(
    <div className={backdropClassName} role="presentation" onClick={handleClose}>
      <div
        className={alertClassName}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-alert-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="feedback-alert__icon-container">{iconMap[type] || iconMap.info}</div>

        <div className="feedback-alert__content">
          {title && (
            <h2 id="feedback-alert-title" className="feedback-alert__title">
              {title}
            </h2>
          )}

          {message && <p className="feedback-alert__message">{message}</p>}
        </div>

        <div className="feedback-alert__footer">
          {footer ? (
            footer
          ) : (
            <div className="feedback-alert__button-group">
              {showCancel && (
                <button
                  type="button"
                  className="feedback-alert__button feedback-alert__button--secondary"
                  onClick={handleCancelClick}
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                className="feedback-alert__button feedback-alert__button--primary"
                onClick={handleConfirm}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>

        {progressBar}
      </div>
    </div>,
    document.body
  );
}

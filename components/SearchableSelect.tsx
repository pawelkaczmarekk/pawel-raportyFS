'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string; email: string }>;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '-- Wybierz partnera --',
  required = false,
  label = 'Wybierz Partnera',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on input value
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Get selected option for display
  const selectedOption = options.find((opt) => opt.name === value);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  // Handle click outside, scroll, and resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      // Clear input value when closing without selection
      if (!value) {
        setInputValue('');
      }
    }
  }, [isOpen, value]);

  const handleSelect = (optionName: string) => {
    onChange(optionName);
    setInputValue(optionName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Open dropdown if not already open
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue || selectedOption?.name || ''}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            // If there's a selected value, put it in inputValue for editing
            if (selectedOption && !inputValue) {
              setInputValue(selectedOption.name);
            }
          }}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            className="p-1 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl overflow-auto transition-all duration-150"
          style={{
            width: `${dropdownPosition.width}px`,
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            maxHeight: '320px',
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.name)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                  value === option.name ? 'bg-blue-100 font-medium' : ''
                }`}
              >
                <div className="text-gray-900">{option.name}</div>
                <div className="text-xs text-gray-500">{option.email}</div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-sm">
              Nie znaleziono partnera "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { User, UserCircle, Users } from "lucide-react";

// Available personalization tags
const PERSONALIZATION_TAGS = [
  { 
    tag: "{{FullName}}", 
    label: "Full Name", 
    description: "Subscriber's full name",
    icon: Users 
  },
  { 
    tag: "{{FirstName}}", 
    label: "First Name", 
    description: "First name only",
    icon: User 
  },
  { 
    tag: "{{LastName}}", 
    label: "Last Name", 
    description: "Last name only",
    icon: UserCircle 
  },
];

// Helper function to get caret coordinates
function getCaretCoordinates(element: HTMLTextAreaElement | HTMLInputElement, position: number) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);
  
  // Copy styles
  const properties = [
    'font', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
    'padding', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
    'border', 'borderWidth', 'boxSizing', 'lineHeight'
  ];
  
  properties.forEach(prop => {
    div.style[prop as any] = style[prop as any];
  });
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflow = 'hidden';
  div.style.width = `${element.clientWidth}px`;
  
  const textBeforeCursor = (element.value || '').substring(0, position);
  const textNode = document.createTextNode(textBeforeCursor);
  div.appendChild(textNode);
  
  // Add a span at the end to measure position
  const span = document.createElement('span');
  span.textContent = '|';
  div.appendChild(span);
  
  document.body.appendChild(div);
  
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  
  const coordinates = {
    left: span.offsetLeft,
    top: span.offsetTop,
  };
  
  document.body.removeChild(div);
  
  return coordinates;
}

export interface TagAutocompleteTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

const TagAutocompleteTextarea = React.forwardRef<
  HTMLTextAreaElement,
  TagAutocompleteTextareaProps
>(({ className, value, onChange, onValueChange, ...props }, ref) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Combine refs
  const combinedRef = (node: HTMLTextAreaElement) => {
    textareaRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Update menu position based on cursor
  const updateMenuPosition = useCallback(() => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const position = textarea.selectionStart;
    const coords = getCaretCoordinates(textarea, position);
    
    // Position menu at cursor position
    setMenuPosition({ 
      top: coords.top + 24, // Below the cursor line
      left: Math.min(coords.left, textarea.clientWidth - 260) // Keep menu visible
    });
  }, []);

  // Check if we should show suggestions (when user types "{{")
  const checkForTrigger = useCallback((text: string, position: number) => {
    // Look for "{{" before cursor position
    const textBeforeCursor = text.substring(0, position);
    const lastOpenBraces = textBeforeCursor.lastIndexOf("{{");
    
    if (lastOpenBraces === -1) {
      setShowSuggestions(false);
      return;
    }

    // Check if there's a closing "}}" between the "{{" and cursor
    const textAfterBraces = textBeforeCursor.substring(lastOpenBraces);
    if (textAfterBraces.includes("}}")) {
      setShowSuggestions(false);
      return;
    }

    // Check the partial input after "{{"
    const partialTag = textAfterBraces.substring(2).toLowerCase();
    
    // Filter tags based on partial input
    const matchingTags = PERSONALIZATION_TAGS.filter(t => 
      t.tag.toLowerCase().includes(partialTag) ||
      t.label.toLowerCase().includes(partialTag)
    );

    if (matchingTags.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(0);
      updateMenuPosition();
    } else {
      setShowSuggestions(false);
    }
  }, [updateMenuPosition]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart;
    
    setCursorPosition(position);
    checkForTrigger(newValue, position);
    
    // Call both onChange handlers
    if (onChange) {
      onChange(e);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < PERSONALIZATION_TAGS.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : PERSONALIZATION_TAGS.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        insertTag(PERSONALIZATION_TAGS[selectedIndex].tag);
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const text = textarea.value || '';
    const position = textarea.selectionStart;
    
    // Find the "{{" before cursor
    const textBeforeCursor = text.substring(0, position);
    const lastOpenBraces = textBeforeCursor.lastIndexOf("{{");
    
    if (lastOpenBraces === -1) return;
    
    // Replace from "{{" to cursor with the complete tag
    const beforeTag = text.substring(0, lastOpenBraces);
    const afterCursor = text.substring(position);
    const newValue = beforeTag + tag + afterCursor;
    
    // Update value
    const event = {
      target: { value: newValue, selectionStart: lastOpenBraces + tag.length }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    if (onChange) {
      // Create a proper synthetic event
      const syntheticEvent = {
        ...event,
        target: { ...textarea, value: newValue },
        currentTarget: { ...textarea, value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
    
    setShowSuggestions(false);
    
    // Set cursor position after the tag
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = lastOpenBraces + tag.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const position = textarea.selectionStart;
    setCursorPosition(position);
    checkForTrigger(textarea.value || '', position);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={combinedRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        {...props}
      />
      
      {/* Autocomplete Menu */}
      {showSuggestions && (
        <div
          ref={menuRef}
          className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ 
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          <div className="px-2 py-1.5 bg-muted/50 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">
              Personalization Tags
            </span>
          </div>
          <div className="py-1">
            {PERSONALIZATION_TAGS.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tag}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === selectedIndex 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => insertTag(item.tag)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className={cn(
                      "text-xs truncate",
                      index === selectedIndex 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground"
                    )}>
                      {item.tag}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-2 py-1.5 bg-muted/30 border-t border-border">
            <span className="text-xs text-muted-foreground">
              ↑↓ Navigate • Enter Select • Esc Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

TagAutocompleteTextarea.displayName = "TagAutocompleteTextarea";

// ============================================
// TagAutocompleteInput - For single-line inputs (titles)
// ============================================

export interface TagAutocompleteInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

const TagAutocompleteInput = React.forwardRef<
  HTMLInputElement,
  TagAutocompleteInputProps
>(({ className, value, onChange, onValueChange, ...props }, ref) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Combine refs
  const combinedRef = (node: HTMLInputElement) => {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Update menu position based on cursor
  const updateMenuPosition = useCallback(() => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const position = input.selectionStart || 0;
    const coords = getCaretCoordinates(input, position);
    
    // Position menu below the input, at cursor position
    setMenuPosition({ 
      top: input.offsetHeight + 4,
      left: Math.min(Math.max(coords.left - 20, 0), input.clientWidth - 260)
    });
  }, []);

  // Check if we should show suggestions (when user types "{{")
  const checkForTrigger = useCallback((text: string, position: number) => {
    const textBeforeCursor = text.substring(0, position);
    const lastOpenBraces = textBeforeCursor.lastIndexOf("{{");
    
    if (lastOpenBraces === -1) {
      setShowSuggestions(false);
      return;
    }

    const textAfterBraces = textBeforeCursor.substring(lastOpenBraces);
    if (textAfterBraces.includes("}}")) {
      setShowSuggestions(false);
      return;
    }

    const partialTag = textAfterBraces.substring(2).toLowerCase();
    
    const matchingTags = PERSONALIZATION_TAGS.filter(t => 
      t.tag.toLowerCase().includes(partialTag) ||
      t.label.toLowerCase().includes(partialTag)
    );

    if (matchingTags.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(0);
      updateMenuPosition();
    } else {
      setShowSuggestions(false);
    }
  }, [updateMenuPosition]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    
    checkForTrigger(newValue, position);
    
    if (onChange) {
      onChange(e);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < PERSONALIZATION_TAGS.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : PERSONALIZATION_TAGS.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        insertTag(PERSONALIZATION_TAGS[selectedIndex].tag);
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const insertTag = (tag: string) => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const text = input.value || '';
    const position = input.selectionStart || 0;
    
    const textBeforeCursor = text.substring(0, position);
    const lastOpenBraces = textBeforeCursor.lastIndexOf("{{");
    
    if (lastOpenBraces === -1) return;
    
    const beforeTag = text.substring(0, lastOpenBraces);
    const afterCursor = text.substring(position);
    const newValue = beforeTag + tag + afterCursor;
    
    if (onChange) {
      const syntheticEvent = {
        target: { ...input, value: newValue },
        currentTarget: { ...input, value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
    
    setShowSuggestions(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = lastOpenBraces + tag.length;
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const position = input.selectionStart || 0;
    checkForTrigger(input.value || '', position);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={combinedRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        {...props}
      />
      
      {/* Autocomplete Menu */}
      {showSuggestions && (
        <div
          ref={menuRef}
          className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ 
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          <div className="px-2 py-1.5 bg-muted/50 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">
              Personalization Tags
            </span>
          </div>
          <div className="py-1">
            {PERSONALIZATION_TAGS.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tag}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === selectedIndex 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => insertTag(item.tag)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className={cn(
                      "text-xs truncate",
                      index === selectedIndex 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground"
                    )}>
                      {item.tag}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-2 py-1.5 bg-muted/30 border-t border-border">
            <span className="text-xs text-muted-foreground">
              ↑↓ Navigate • Enter Select • Esc Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

TagAutocompleteInput.displayName = "TagAutocompleteInput";

export { TagAutocompleteTextarea, TagAutocompleteInput, PERSONALIZATION_TAGS };

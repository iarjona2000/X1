import * as React from 'react';

const CollapsibleContext = React.createContext({
  open: true,
  onOpenChange: () => {},
});

export function Collapsible({ defaultOpen = true, children, className, onOpenChange, ...props }) {
  const [open, setOpen] = React.useState(defaultOpen);

  const handleOpenChange = React.useCallback((value) => {
    setOpen(value);
    onOpenChange?.(value);
  }, [onOpenChange]);

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className} data-state={open ? 'open' : 'closed'} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({ children, className, asChild, ...props }) {
  const { open, onOpenChange } = React.useContext(CollapsibleContext);

  const handleClick = () => {
    onOpenChange(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      'data-state': open ? 'open' : 'closed',
      ...props,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-state={open ? 'open' : 'closed'}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function CollapsibleContent({ children, className, ...props }) {
  const { open } = React.useContext(CollapsibleContext);
  const contentRef = React.useRef(null);
  const [height, setHeight] = React.useState(open ? 'auto' : '0px');

  React.useEffect(() => {
    if (open) {
      setHeight('auto');
    } else {
      setHeight('0px');
    }
  }, [open]);

  return (
    <div
      ref={contentRef}
      data-state={open ? 'open' : 'closed'}
      className={className}
      style={{
        height: height,
        overflow: 'hidden',
        transition: 'height 200ms cubic-bezier(0.175, 0.885, 0.32, 1.1)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

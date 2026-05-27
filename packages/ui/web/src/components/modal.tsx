"use client";

import * as React from "react";

import { cn } from "@workspace/ui";
import { useBreakpoint } from "@workspace/ui-web";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#components/drawer";

import type { CommonProps } from "@workspace/shared/types";

type WithBaseProps<T> = T & {
  render?: React.ReactElement;
  children?: React.ReactNode;
  className?: string;
};

type ModalProps<
  DialogComponent extends React.ElementType,
  DrawerComponent extends React.ElementType,
> = WithBaseProps<
  CommonProps<
    React.ComponentProps<DialogComponent>,
    React.ComponentProps<DrawerComponent>
  >
> & {
  dialog?: WithBaseProps<React.ComponentProps<DialogComponent>>;
  drawer?: WithBaseProps<React.ComponentProps<DrawerComponent>>;
};

const ModalContext = React.createContext<{ isDesktop: boolean }>({
  isDesktop: false,
});

const useModalContext = () => {
  const context = React.useContext(ModalContext);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!context) {
    throw new Error(
      "Modal components cannot be rendered outside the ModalContext.",
    );
  }
  return context;
};

const Modal = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof Dialog, typeof Drawer>) => {
  const isDesktop = useBreakpoint("md");
  const component = isDesktop ? (
    <Dialog {...props} {...dialog} />
  ) : (
    <Drawer {...props} {...drawer} />
  );

  return (
    <ModalContext.Provider value={{ isDesktop }}>
      {component}
    </ModalContext.Provider>
  );
};

const ModalTrigger = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogTrigger, typeof DrawerTrigger>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogTrigger {...props} {...dialog} />;
  }

  return (
    <DrawerTrigger
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

const ModalClose = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogClose, typeof DrawerClose>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogClose {...props} {...dialog} />;
  }

  return (
    <DrawerClose
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

const ModalContent = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogContent, typeof DrawerContent>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogContent {...props} {...dialog} />;
  }

  return (
    <DrawerContent
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

const ModalDescription = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogDescription, typeof DrawerDescription>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogDescription {...props} {...dialog} />;
  }

  return (
    <DrawerDescription
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

const ModalHeader = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogHeader, typeof DrawerHeader>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogHeader {...props} {...dialog} />;
  }

  return (
    <DrawerHeader
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

const ModalTitle = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogTitle, typeof DrawerTitle>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogTitle {...props} {...dialog} />;
  }

  return (
    <DrawerTitle
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

const ModalBody = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) => {
  return <div className={cn("px-6 md:px-0", className)} {...props} />;
};

const ModalFooter = ({
  dialog,
  drawer,
  ...props
}: ModalProps<typeof DialogFooter, typeof DrawerFooter>) => {
  const { isDesktop } = useModalContext();

  if (isDesktop) {
    return <DialogFooter {...props} {...dialog} />;
  }

  return (
    <DrawerFooter
      {...props}
      {...drawer}
      {...((props.render ?? drawer?.render) && {
        children: props.render ?? drawer?.render,
        asChild: true,
      })}
    />
  );
};

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
};

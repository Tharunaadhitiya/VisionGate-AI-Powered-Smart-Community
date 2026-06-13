'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { fadeUp, staggerContainer, staggerItem, cardHover, scaleIn, slideInRight } from '@/lib/animation';

export const AnimatedDiv = motion.div;

export const PageTransition = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <AnimatedDiv
    ref={ref}
    initial={{ opacity: 0, y: 12, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
    exit={{ opacity: 0, y: -8, scale: 0.99, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } }}
    {...props}
  />
));
PageTransition.displayName = 'PageTransition';

export const CardWrapper = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <AnimatedDiv
    ref={ref}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    whileHover={{ y: -3, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.12)' }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    {...props}
  />
));
CardWrapper.displayName = 'CardWrapper';

export const StaggerContainer = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <AnimatedDiv ref={ref} variants={staggerContainer} initial="hidden" animate="visible" {...props} />
));
StaggerContainer.displayName = 'StaggerContainer';

export const StaggerItem = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <AnimatedDiv ref={ref} variants={staggerItem} {...props} />
));
StaggerItem.displayName = 'StaggerItem';

export const ScaleIn = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <AnimatedDiv ref={ref} variants={scaleIn} initial="hidden" animate="visible" {...props} />
));
ScaleIn.displayName = 'ScaleIn';

export const SlideInRight = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <AnimatedDiv ref={ref} variants={slideInRight} initial="hidden" animate="visible" {...props} />
));
SlideInRight.displayName = 'SlideInRight';

import React from 'react';
import {
  FileText,
  AlignLeft,
  Hash,
  CircleDollarSign,
  Calendar,
  Clock,
  CheckCircle,
  List,
  Signature
} from 'lucide-react';

export const ColumnIcons = {
  string: FileText,
  text: AlignLeft,
  number: Hash,
  decimal: CircleDollarSign,
  date: Calendar,
  datetime: Clock,
  boolean: CheckCircle,
  enum: List,
  signature: Signature,
};

export const getColumnIcon = (type: string, className: string = "w-5 h-5") => {
  const IconComponent = ColumnIcons[type as keyof typeof ColumnIcons] || ColumnIcons.string;
  return <IconComponent className={className} />;
};

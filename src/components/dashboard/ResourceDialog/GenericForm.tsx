
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AmenitiesSelector } from '../AmenitiesSelector';
import { FieldDefinition, FormValues } from './types';
import ImageUploader from '../ImageUploader';
import { InterestSelector } from './components/InterestSelector';
import { formatCurrency } from '@/lib/utils';

interface GenericFormProps {
  fields: FieldDefinition[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  onSelectChange?: (name: string, value: string) => void;
  onSwitchChange?: (name: string, checked: boolean) => void;
  onLeadSelect?: (leadId: string, leadName: string) => void;
  onDateChange?: (name: string, date: Date | undefined) => void;
  onAmenitiesChange?: (amenities: string[]) => void;
  isSubmitting?: boolean;
  formId: string;
  selectedAmenities?: string[];
  resourceType?: string;
  desarrolloId?: string;
  prototipo_id?: string;
  lead_id?: string;
  onImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploading?: boolean;
  isExistingClient?: boolean;
  onExistingClientChange?: (isExisting: boolean) => void;
  newClientData?: { nombre: string; email: string; telefono: string };
  onNewClientDataChange?: (field: string, value: string) => void;
  onDesarrolloSelect?: (desarrolloId: string) => void;
}

const GenericForm = ({
  fields,
  values,
  onChange,
  onSelectChange,
  onSwitchChange,
  onLeadSelect,
  onDateChange,
  onAmenitiesChange,
  formId,
  isSubmitting = false,
  selectedAmenities = [],
  resourceType,
  desarrolloId,
  prototipo_id,
  lead_id,
  onImageUpload,
  uploading = false,
  isExistingClient = false,
  onExistingClientChange,
  newClientData,
  onNewClientDataChange,
  onDesarrolloSelect,
}: GenericFormProps) => {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [tabs, setTabs] = useState<{ id: string; label: string }[]>([]);
  
  const hasOptions = (options?: { label: string; value: string }[]) => {
    return Array.isArray(options) && options.length > 0;
  };

  const generateValidationSchema = () => {
    const schema: { [key: string]: any } = {};
    
    fields.forEach((field) => {
      if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
        schema[field.name] = field.required ? z.string().min(1, { message: "Este campo es obligatorio" }) : z.string().optional();
      } else if (field.type === 'number') {
        schema[field.name] = field.required ? z.number().min(0, { message: "Este campo es obligatorio" }) : z.number().optional();
      } else if (field.type === 'select') {
        schema[field.name] = field.required ? z.string().min(1, { message: "Este campo es obligatorio" }) : z.string().optional();
      } else if (field.type === 'date') {
        schema[field.name] = field.required ? z.string().min(1, { message: "Este campo es obligatorio" }) : z.string().optional();
      } else if (field.type === 'switch') {
        schema[field.name] = z.boolean().optional();
      } else if (field.type === 'amenities') {
        schema[field.name] = z.array(z.string()).optional();
      } else if (field.type === 'image-upload' || field.type === 'upload') {
        schema[field.name] = z.string().optional();
      } else if (field.type === 'interest-selector') {
        schema[field.name] = z.string().optional();
      }
    });
    
    return z.object(schema);
  };

  const validationSchema = generateValidationSchema();
  type ValidationSchema = z.infer<typeof validationSchema>;

  const form = useForm<ValidationSchema>({
    resolver: zodResolver(validationSchema),
    defaultValues: values as any,
  });

  useEffect(() => {
    form.reset(values as any);
  }, [form, values]);

  const onFormChange = (name: string, value: any) => {
    const updatedValues = { [name]: value };
    onChange(updatedValues);
    
    if (onSelectChange && fields.some(field => field.name === name && (field.type === 'select' || field.type === 'select-lead'))) {
      onSelectChange(name, value as string);
    }
    
    if (onSwitchChange && fields.some(field => field.name === name && field.type === 'switch')) {
      onSwitchChange(name, value as boolean);
    }
    
    if (onDateChange && fields.some(field => field.name === name && field.type === 'date')) {
      onDateChange(name, value as Date | undefined);
    }
  };

  useEffect(() => {
    const uniqueTabs = fields
      .filter(field => field.tab)
      .map(field => field.tab as string)
      .filter((value, index, self) => self.indexOf(value) === index)
      .map(tab => ({ id: tab, label: tab.charAt(0).toUpperCase() + tab.slice(1) }));
    
    if (uniqueTabs.length > 0) {
      setTabs(uniqueTabs);
    } else {
      setTabs([{ id: 'general', label: 'General' }]);
    }
  }, [fields]);

  const renderField = (field: FieldDefinition) => {
    if (!field.tab || field.tab === activeTab) {
      return (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name as any}
          render={({ field: formField }) => (
            <FormItem className="mb-4">
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                {field.type === 'text' || field.type === 'email' ? (
                  <Input
                    type={field.type}
                    {...formField}
                    readOnly={field.readOnly}
                    className={field.readOnly ? "bg-gray-100" : field.required ? "border-slate-300" : ""}
                    onChange={(e) => {
                      formField.onChange(e);
                      if (!field.readOnly) {
                        onFormChange(field.name, e.target.value);
                      }
                    }}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'number' ? (
                  <Input
                    type="number"
                    {...formField}
                    readOnly={field.readOnly}
                    className={field.readOnly ? "bg-gray-100" : field.required ? "border-slate-300" : ""}
                    value={formField.value === undefined || formField.value === null ? '' : formField.value}
                    formatCurrency={field.formatCurrency}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : Number(e.target.value);
                      formField.onChange(value);
                      if (!field.readOnly) {
                        onFormChange(field.name, value);
                      }
                    }}
                    placeholder={field.placeholder || (field.formatCurrency ? '$0' : '0')}
                  />
                ) : field.type === 'textarea' ? (
                  <Textarea
                    {...formField}
                    readOnly={field.readOnly}
                    className={field.readOnly ? "bg-gray-100" : field.required ? "border-slate-300" : ""}
                    onChange={(e) => {
                      formField.onChange(e);
                      if (!field.readOnly) {
                        onFormChange(field.name, e.target.value);
                      }
                    }}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'select' ? (
                  <Select
                    value={formField.value?.toString() || ''}
                    disabled={field.readOnly}
                    onValueChange={(value) => {
                      formField.onChange(value);
                      if (!field.readOnly) {
                        onFormChange(field.name, value);
                      }
                    }}
                  >
                    <SelectTrigger className={field.readOnly ? "bg-gray-100" : field.required ? "border-slate-300" : ""}>
                      <SelectValue placeholder={field.placeholder || `Seleccionar ${field.label}...`} />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      {hasOptions(field.options) ? (
                        field.options!.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-options" disabled>No hay opciones disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : field.type === 'date' ? (
                  <Input
                    type="date"
                    {...formField}
                    readOnly={field.readOnly}
                    className={field.readOnly ? "bg-gray-100" : field.required ? "border-slate-300" : ""}
                    onChange={(e) => {
                      formField.onChange(e);
                      if (!field.readOnly) {
                        onFormChange(field.name, e.target.value);
                      }
                    }}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'switch' ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formField.value || false}
                      disabled={field.readOnly}
                      onCheckedChange={(checked) => {
                        formField.onChange(checked);
                        if (!field.readOnly) {
                          onFormChange(field.name, checked);
                        }
                      }}
                    />
                    <span className="text-sm text-gray-500">
                      {formField.value ? 'Activado' : 'Desactivado'}
                    </span>
                  </div>
                ) : field.type === 'amenities' ? (
                  <AmenitiesSelector
                    selectedAmenities={selectedAmenities}
                    onChange={onAmenitiesChange || (() => {})}
                  />
                ) : field.type === 'image-upload' ? (
                  <ImageUploader
                    entityId={values.id || 'new'}
                    bucketName={field.bucket || 'prototipo-images'}
                    folderPath={field.folder || 'general'}
                    currentImageUrl={formField.value as string}
                    onImageUploaded={(imageUrl) => {
                      formField.onChange(imageUrl);
                      if (!field.readOnly) {
                        onFormChange(field.name, imageUrl);
                      }
                    }}
                  />
                ) : field.type === 'interest-selector' ? (
                  <InterestSelector
                    value={formField.value as string}
                    onChange={(value) => {
                      formField.onChange(value);
                      if (!field.readOnly) {
                        onFormChange(field.name, value);
                      }
                    }}
                    label=""
                    description={field.description}
                  />
                ) : null}
              </FormControl>
              {field.readOnly && !field.description && (
                <p className="text-xs text-gray-500 mt-1">
                  Este campo se actualiza automáticamente basado en el estado de las unidades
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    return null;
  };

  return (
    <div>
      <Form {...form}>
        {tabs.length > 1 ? (
          <Tabs defaultValue={tabs[0].id} value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
            
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="py-4">
                {fields.filter(field => field.tab === tab.id).map(renderField)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="space-y-4 py-2">
            {fields.map(renderField)}
          </div>
        )}
      </Form>
    </div>
  );
};

export default GenericForm;

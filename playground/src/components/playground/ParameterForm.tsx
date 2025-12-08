import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Method, FormValues } from '@/types/playground';
import { validateForm, ValidationErrors } from '@/lib/validation';
import { FlaskConical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParameterFormProps {
  method: Method;
  values: FormValues;
  onChange: (values: FormValues) => void;
  onSimulate: () => void;
  isSimulating: boolean;
}

export default function ParameterForm({
  method,
  values,
  onChange,
  onSimulate,
  isSimulating,
}: ParameterFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fee = values.amount ? (parseFloat(values.amount) * 0.01).toFixed(2) : '0.00';
  const descriptionLength = values.description?.length || 0;

  const getValuesAsRecord = (): Record<string, string> => ({
    provider: values.provider || '',
    amount: values.amount || '',
    deadlineValue: values.deadlineValue || '',
    deadlineUnit: values.deadlineUnit || 'hours',
    description: values.description || '',
    txId: values.txId || '',
    newState: values.newState || '',
    escrowAddress: values.escrowAddress || '',
    reason: values.reason || '',
    resolution: values.resolution || '',
  });

  const updateValue = (key: keyof FormValues, value: string) => {
    onChange({ ...values, [key]: value });
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    // Validate on blur
    const newErrors = validateForm(method.id, getValuesAsRecord());
    setErrors(newErrors);
  };

  const handleSimulate = () => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    method.params.forEach(p => {
      allTouched[p.name] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const newErrors = validateForm(method.id, getValuesAsRecord());
    setErrors(newErrors);

    // Only simulate if no errors
    if (Object.keys(newErrors).length === 0) {
      onSimulate();
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  };

  return (
    <div className="flex-1 p-5 space-y-5 border-r border-secondary">
      <div>
        <h3 className="text-h2 text-foreground mb-1">{method.name}</h3>
        <p className="text-sm text-muted-foreground">{method.description}</p>
      </div>

      <div className="space-y-4">
        {method.params.map((param) => {
          const error = getFieldError(param.name);
          const hasError = !!error;

          return (
            <div key={param.name} className="space-y-2">
              <Label className="text-sm text-foreground">
                {param.label}
                {param.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {param.type === 'address' && (
                <div className="space-y-1">
                  <Input
                    placeholder={param.placeholder}
                    value={values[param.name as keyof FormValues] || ''}
                    onChange={(e) => updateValue(param.name as keyof FormValues, e.target.value)}
                    onBlur={() => handleBlur(param.name)}
                    className={cn(
                      "font-mono transition-colors duration-200",
                      hasError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {hasError && (
                    <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                </div>
              )}

              {param.type === 'number' && (
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder={param.placeholder}
                    value={values.amount || ''}
                    onChange={(e) => updateValue('amount', e.target.value)}
                    onBlur={() => handleBlur('amount')}
                    className={cn(
                      "transition-colors duration-200",
                      hasError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {hasError ? (
                    <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  ) : param.name === 'amount' && values.amount && (
                    <p className="text-xs text-muted-foreground">
                      Minimum: $0.05 | Fee: ${fee} (1%)
                    </p>
                  )}
                </div>
              )}

              {param.type === 'deadline' && (
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="24"
                      value={values.deadlineValue || ''}
                      onChange={(e) => updateValue('deadlineValue', e.target.value)}
                      onBlur={() => handleBlur('deadlineValue')}
                      className={cn(
                        "flex-1 transition-colors duration-200",
                        getFieldError('deadlineValue') && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    <Select 
                      value={values.deadlineUnit || 'hours'} 
                      onValueChange={(v) => updateValue('deadlineUnit', v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">hours</SelectItem>
                        <SelectItem value="days">days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {getFieldError('deadlineValue') && (
                    <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3 h-3" />
                      {getFieldError('deadlineValue')}
                    </p>
                  )}
                  {!getFieldError('deadlineValue') && (
                    <p className="text-xs text-muted-foreground">
                      Provider must accept before deadline
                    </p>
                  )}
                </div>
              )}

              {param.type === 'text' && param.name === 'description' && (
                <div className="space-y-1">
                  <Textarea
                    placeholder={param.placeholder}
                    value={values.description || ''}
                    onChange={(e) => updateValue('description', e.target.value)}
                    onBlur={() => handleBlur('description')}
                    maxLength={280}
                    className={cn(
                      "transition-colors duration-200",
                      getFieldError('description') && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <div className="flex justify-between">
                    {getFieldError('description') ? (
                      <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError('description')}
                      </p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {descriptionLength}/280
                    </p>
                  </div>
                </div>
              )}

              {param.type === 'text' && param.name !== 'description' && (
                <div className="space-y-1">
                  <Input
                    placeholder={param.placeholder}
                    value={values[param.name as keyof FormValues] || ''}
                    onChange={(e) => updateValue(param.name as keyof FormValues, e.target.value)}
                    onBlur={() => handleBlur(param.name)}
                    className={cn(
                      param.name.includes('Address') || param.name.includes('Hash') ? 'font-mono' : '',
                      "transition-colors duration-200",
                      hasError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {hasError && (
                    <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                </div>
              )}

              {param.type === 'select' && param.options && (
                <Select 
                  value={values[param.name as keyof FormValues] || ''} 
                  onValueChange={(v) => updateValue(param.name as keyof FormValues, v)}
                >
                  <SelectTrigger className={cn(
                    hasError && "border-destructive focus-visible:ring-destructive"
                  )}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {param.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}

        {method.params.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            This method has no parameters.
          </p>
        )}
      </div>

      <div className="pt-4">
        <Button 
          onClick={handleSimulate} 
          disabled={isSimulating}
          className="w-full"
        >
          <FlaskConical className="w-4 h-4" />
          {isSimulating ? 'Simulating...' : 'Simulate Transaction'}
        </Button>
      </div>
    </div>
  );
}

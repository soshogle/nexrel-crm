<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


class CurrentValueCalculator extends CalculatorBase
{

    public function ExecutedCalculation($value)
    {
        if($value==null)
            $value=$this->Field->GetValue();

        if(trim($value)=='')
            return $this->CreateCalculationObject('','',0);

        if(!\is_numeric($value))
            return $this->CreateCalculationObject('','',0);
        else
            return $this->CreateCalculationObject($value,'',$this->GetQuantityInput());


    }
}
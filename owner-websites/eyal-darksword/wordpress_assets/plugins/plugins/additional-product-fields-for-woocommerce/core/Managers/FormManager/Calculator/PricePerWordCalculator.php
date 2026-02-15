<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;

class PricePerWordCalculator extends CalculatorBase
{

    public function ExecutedCalculation($value)
    {
        if($value==null)
            $value=$this->Field->GetValue();
        $match=array();
        \preg_match_all('/\S+/',$value,$match);

        if(\count($match)==0)
            $numberOfChars=0;
        else
            $numberOfChars=\count($match[0]);

        $freeChars=$this->Field->Options->FreeCharOrWords;
        if($freeChars>0)
            $numberOfChars=max(0,$numberOfChars-$freeChars);

        if(\strlen($value)>0)
            if($this->Field->GetSalePrice()!='')
                return $this->CreateCalculationObject(
                    $this->Field->GetRegularPrice()!=''?NumericUtilities::ParseNumber($this->Field->GetRegularPrice())*$numberOfChars:'',
                    $this->Field->GetSalePrice()!=''?NumericUtilities::ParseNumber($this->Field->GetSalePrice())*$numberOfChars:'',
                    $this->GetQuantityInput()
                );
            else
                return $this->CreateCalculationObject($this->Field->GetRegularPrice()!=''?NumericUtilities::ParseNumber($this->Field->GetRegularPrice())*$numberOfChars:'',
                    '',$this->GetQuantityInput());
        return $this->CreateCalculationObject('','',0);
    }
}
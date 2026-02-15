<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


class QuantityCalculator extends CalculatorBase
{
    public function __construct($field)
    {
        parent::__construct($field);
    }

    public function ExecutedCalculation($value)
    {
        if($value==null)
            $value=$this->Field->GetValue();

        $quantity=\floatval($value);
        if(!\is_numeric($value))
          $quantity=0;

        if(\strlen($value)>0)
            if($this->Field->GetSalePrice()!='')
                return $this->CreateCalculationObject($this->Field->GetRegularPrice(),
                    $this->Field->GetSalePrice(),$quantity
                    );
            else
                return $this->CreateCalculationObject($this->Field->GetRegularPrice(),'',$quantity);

        return $this->CreateCalculationObject('','',0);


    }
}
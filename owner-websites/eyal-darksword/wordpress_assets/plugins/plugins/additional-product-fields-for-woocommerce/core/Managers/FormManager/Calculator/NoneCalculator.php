<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


class NoneCalculator extends CalculatorBase
{

    public function ExecutedCalculation($value)
    {
        return $this->CreateCalculationObject('','','');
    }


}
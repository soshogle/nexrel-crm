<?php

namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;



class GlobalCalculator extends CalculatorBase
{
    public function ExecutedCalculation($value)
    {
        if($value==null)
            $value=$this->Field->GetValue();

        $quantity=\floatval($value);
        if(!\is_numeric($value))
            $quantity=0;



        return $this->CreateCalculationObject('','',$value);


    }


    public function UpdatePrice($newPrice, $newSale, $newQuantity)
    {


        $this->Quantity=\floatval($newQuantity);

        $this->IsUsed=$newQuantity!=trim('');
    }



}
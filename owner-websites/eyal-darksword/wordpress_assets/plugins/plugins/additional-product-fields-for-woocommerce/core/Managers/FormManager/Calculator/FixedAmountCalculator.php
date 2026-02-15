<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


class FixedAmountCalculator extends CalculatorBase
{
    private $CustomSalePrice;
    private $CustomRegularPrice;

    public function __construct($field)
    {
        parent::__construct($field);
        $this->CustomRegularPrice=null;
        $this->CustomSalePrice=null;
    }


    public function SetRegularPrice($price)
    {
        $this->CustomRegularPrice=$price;
        return $this;
    }

    public function SetSalePrice($price){
        $this->CustomSalePrice=$price;
        return $this;
    }


    public function ExecutedCalculation($value)
    {
        if($value==null)
            $value=$this->Field->GetValue();

        $regularPriceToUse=$this->CustomRegularPrice!=null?$this->CustomRegularPrice:$this->Field->GetRegularPrice();
        $salePriceToUse=$this->CustomSalePrice!=null?$this->CustomSalePrice:$this->Field->GetSalePrice();

        if((\is_array($value)&&count($value)>0) ||(\is_scalar($value)&& \strlen($value)>0)||
            ($this->Field->Options->Type=='daterange'&&$this->Field->GetEntryValue('Value',null)!=null)||
            ($this->Field->Options->Type=='googlemaps'&&$this->Field->GetEntryValue('Value',null)!=null)
        )
        {
            if($salePriceToUse!='')
            {
                return $this->CreateCalculationObject($regularPriceToUse,$salePriceToUse,$this->GetQuantityInput());
            }else
                return $this->CreateCalculationObject($regularPriceToUse,'',$this->GetQuantityInput());
        }else
            return $this->CreateCalculationObject('','',0);
    }


}
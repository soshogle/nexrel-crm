<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use Exception;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBMultipleOptionsField;
use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;

class PricePerItemCalculator extends CalculatorBase
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

        $numberOfItems=\count($value);

        $regularPriceToUse=$this->CustomRegularPrice!=null?$this->CustomRegularPrice:$this->Field->GetRegularPrice();
        $salePriceToUse=$this->CustomSalePrice!=null?$this->CustomSalePrice:$this->Field->GetSalePrice();


        if($regularPriceToUse!='')
            $regularPriceToUse*=$numberOfItems;
        if($salePriceToUse!='')
            $salePriceToUse*=$numberOfItems;

        if((\is_array($value)&&count($value)>0) ||(!\is_array($value)&& \strlen($value)>0))
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
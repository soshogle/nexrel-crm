<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;

class PercentOfOriginalPricePlusOptionsCalculator extends CalculatorBase
{

    private $SalePercentage;
    private $RegularPercentage;
    public function __construct($field)
    {
        parent::__construct($field);
        $this->SalePercentage=null;
        $this->RegularPercentage=null;
    }

    public function SetRegularPercentage($price)
    {
        $this->RegularPercentage=$price;
        return $this;
    }

    public function SetSalePercentage($price){
        $this->SalePercentage=$price;
        return $this;
    }

    public function ExecutedCalculation($value)
    {
        if($value==null)
            $value=$this->Field->GetValue();

        if(\strlen($value)>0)
        {
            $productPriceToUse=$this->Field->Column->Row->Form->GetProductRegularPrice();
            $productSalePrice=$this->Field->Column->Row->Form->GetProductSalePrice();

            if($productSalePrice!='')
                $productPriceToUse=$productSalePrice;

            $productPriceToUse=NumericUtilities::ParseNumber($productPriceToUse);
            $productPriceToUse+=$this->Field->Column->Row->Form->GetPriceOfNotDependantFields();

            $salePercentage=$this->SalePercentage==null?$this->Field->GetSalePrice():$this->SalePercentage;
            $regularPercentage=$this->RegularPercentage==null?$this->Field->GetRegularPrice():$this->RegularPercentage;

            $regularPrice='';
            $salePrice='';

            if($salePercentage!='')
            {
                $percentage=NumericUtilities::ParseNumber($salePercentage);
                if($percentage>0)
                    $percentage=$percentage/100;
                $salePrice=NumericUtilities::ParseNumber($productPriceToUse)*$percentage;
            }

            if($regularPercentage!='')
            {
                $percentage=NumericUtilities::ParseNumber($regularPercentage);
                if($percentage>0)
                    $percentage=$percentage/100;

                $regularPrice=NumericUtilities::ParseNumber($productPriceToUse)*$percentage;
            }

            if(\strlen($value)>0)
                if($salePrice!='')
                    return $this->CreateCalculationObject($regularPrice,$salePrice,$this->GetQuantityInput());
                else
                    return $this->CreateCalculationObject($regularPrice,'',$this->GetQuantityInput());
        }else
            return $this->CreateCalculationObject('','',0);
    }

    public function GetDependsOnOtherFields()
    {
        return true;
    }


}
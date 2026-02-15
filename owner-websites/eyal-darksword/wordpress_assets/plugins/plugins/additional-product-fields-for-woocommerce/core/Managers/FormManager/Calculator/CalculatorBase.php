<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;

abstract class CalculatorBase
{
    public $RegularPrice;
    public $SalePrice;
    public $IsSale;
    public $IsUsed;
    public $Quantity;
    public $Price;
    /** @var FBFieldBase */
    public $Field;
    public function __construct($field)
    {
        $this->Price=null;
        $this->SalePrice=null;
        $this->RegularPrice=null;
        $this->Field=$field;
    }

    public function UpdatePrice($newPrice,$newSale,$newQuantity)
    {
        if($newPrice==''&&$newSale=='')
        {
            $this->Price=0;
            $this->IsUsed=false;
            $this->SalePrice=0;
            $this->Quantity=0;
        }else{
            $this->IsUsed=true;
            $this->Quantity=$newQuantity;
            $price=NumericUtilities::ParseNumber($newPrice,0);
            if($newSale!='')
            {
                $this->IsUsed=true;
                $salePrice=NumericUtilities::ParseNumber($newSale,0);
                $this->Price=$salePrice*$newQuantity;
                $this->SalePrice=$salePrice*$newQuantity;
                $this->RegularPrice=$price*$newQuantity;
            }else{
                $this->IsUsed=true;
                $this->Price=$price*$newQuantity;
                $this->SalePrice=0;
                $this->RegularPrice=$price*$newQuantity;
            }

        }

    }

    public function GetIsSale(){
        return $this->IsSale;
    }

    public function GetPrice(){
        if($this->IsUsed)
            return $this->Price;
        return 0;
    }

    public function  GetSalePrice(){
        if($this->IsUsed)
            return $this->SalePrice;
        return 0;
    }

    public function GetQuantity(){
        if($this->IsUsed)
            return $this->Quantity;
        else
            return 0;
    }

    public function GetIsValid(){
        return true;
    }

    public function CreateCalculationObject($regularPrice,$salePrice,$quantity)
    {
        return array(
            'Quantity'=>$quantity,
            'RegularPrice'=>$regularPrice,
            'SalePrice'=>$salePrice
        );
    }

    public function GetDependsOnOtherFields(){
        return false;
    }

    public function ExecuteAndUpdate(){
        $price=$this->ExecutedCalculation(null);
        $this->UpdatePrice($price['RegularPrice'],$price['SalePrice'],$price['Quantity']);

    }

    public function GetQuantityInput()
    {
        return \floatval($this->Field->GetEntryValue('Quantity',0));
    }

    public abstract function ExecutedCalculation($value);
}
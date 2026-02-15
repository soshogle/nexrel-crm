<?php


namespace rednaowooextraproduct\core\Managers\FormManager;




use DOMDocument;
use rednaowooextraproduct\core\Loader;
use rednaowooextraproduct\core\Managers\FormManager\Calculator\GlobalCalculator;
use rednaowooextraproduct\core\Managers\FormManager\ContainerManager\ContainerDataRetriever;
use rednaowooextraproduct\core\Managers\FormManager\ContainerManager\ContainerManager;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\core\Utils\ArrayUtils;
use rednaowooextraproduct\repository\ProductRepository;
use rednaowooextraproduct\Utilities\Sanitizer;
use undefined\DTO\FormBuilderOptions;
use WC_Product;

class FormBuilder implements ContainerDataRetriever
{
    /** @var FormBuilderOptions */
    public $Options;
    /** @var FBRow[] */
    public $Rows;
    public $Entries;
    /** @var WC_Product */
    public $Product;

    public $OptionsUnitPrice;
    public $GrandTotal;
    public $Quantity;
    public $OptionsTotal;

    /** @var FBFieldBase[] */
    public $Fields;
    /** @var Loader */
    public $Loader;
    /** @var ContainerManager */
    public $ContainerManager;

    private $variations;
    public function __construct($loader,$options,$entry,$product)
    {
        $this->variations=null;
        $this->ContainerManager=new ContainerManager($this);
        $this->Loader=$loader;
        $this->Fields=array();
        $this->Entries=$entry;
        $this->Options=$options;
        $this->Rows=array();
        $this->Product=$product;

        $this->OptionsUnitPrice=0;
        $this->GrandTotal=0;
        $this->Quantity=0;
        $this->OptionsTotal=0;


    }

    public function CalculationsAreValid()
    {
        foreach($this->Fields as $field)
        {
            if(!$field->Calculator->GetIsValid())
                return false;
        }

        return true;

    }
    public function GetPrice(){
        return $this->Product->get_price();
    }

    public function GetProductRegularPrice(){
        return $this->Product->get_regular_price();
    }

    public function GetProductSalePrice(){
        return $this->Product->get_sale_price();
    }

    public function Initialize(){
        foreach($this->Options->Rows as $row)
            $this->Rows[]=new FBRow($this->Loader,$this,$row);

        foreach($this->Rows as $Row)
            foreach ($Row->Columns as $Column)
                $this->Fields[]=$Column->Field;

            if($this->Entries!=null)
                $this->ExecuteCalculations();

        return $this;
    }

    public function GetForm(){
        return null;
    }

    public function GetRootForm(){
        return $this;
    }

    public function GetPriceOfNotDependantFields()
    {
        $total=0;
        foreach($this->Fields as $field)
        {
            if(!$field->Calculator->GetDependsOnOtherFields())
                $total+=$field->Calculator->GetPrice();
        }

        return $total;
    }

    public function GetAttributeValue($attributeName){
        return $this->Product->get_attribute($attributeName);

    }

    public function GetSelectedVariable(){
        if($this->variations==null)
        {
            $productRepository=new ProductRepository();
            $this->variations=$productRepository->get_available_variation($this->Product,$this->Product);
        }

        return $this->variations;
    }


    private function ExecuteCalculations()
    {
        foreach($this->Fields as $field)
        {
            if(!$field->Calculator->GetDependsOnOtherFields())
                $field->Calculator->ExecuteAndUpdate();
        }


        foreach($this->Fields as $field)
        {
            if($field->Calculator->GetDependsOnOtherFields())
                $field->Calculator->ExecuteAndUpdate();
        }


        foreach($this->ContainerManager->GetFields(false,false,false) as $field)
        {
            $this->OptionsUnitPrice+=$field->Calculator->GetPrice();
        }

        foreach($this->ContainerManager->GetFields(false,false,false) as $field)
        {
            if($field->Calculator instanceof GlobalCalculator)
                $this->Quantity+=$field->Calculator->GetQuantity();

        }

        if($this->Quantity==0)
            $this->Quantity=1;

        $this->GrandTotal=(Sanitizer::SanitizeNumber($this->OptionsUnitPrice)+Sanitizer::SanitizeNumber($this->GetPrice()))*$this->Quantity;
        $this->OptionsTotal=$this->OptionsUnitPrice*$this->Quantity;
/*
        foreach($this->Fields as $field)
        {
            $this->OptionsUnitPrice+=$field->Calculator->GetPrice();
        }


        $this->GrandTotal=($this->OptionsUnitPrice+$this->GetPrice())*$this->Quantity;

*/
    }

    public function GenerateLineItems()
    {
        $lineItems=array();
        foreach($this->Fields as $field)
        {
            if($field->Entry==null)
                continue;
            $lineItems=\array_merge($lineItems,$field->GetLineItems());
        }

        return $lineItems;

    }

    /**
     * @param $document DOMDocument
     */
    public function GetHtml($document){
        return $this->ContainerManager->GetHtml($document);
    }


    /**
     * @inheritDoc
     */
    public function GetRows()
    {
        return $this->Rows;
    }

}
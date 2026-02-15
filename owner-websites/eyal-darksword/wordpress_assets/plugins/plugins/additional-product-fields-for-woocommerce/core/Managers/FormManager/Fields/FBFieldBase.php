<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Fields;

use Couchbase\Document;
use DOMDocument;
use DOMElement;
use Exception;
use rednaowooextraproduct\core\Loader;
use rednaowooextraproduct\core\Managers\ConditionManager\Comparator\ComparisonSource;
use rednaowooextraproduct\core\Managers\FormManager\Calculator\CalculatorBase;
use rednaowooextraproduct\core\Managers\FormManager\Calculator\CalculatorFactory;
use rednaowooextraproduct\core\Managers\FormManager\Calculator\NoneCalculator;
use rednaowooextraproduct\core\Managers\FormManager\FBColumn;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\HtmlTagWrapper;
use rednaowooextraproduct\pr\Managers\FormManager\Calculator\FormulaCalculator;
use undefined\DTO\FBFieldBaseOptions;

abstract class FBFieldBase implements ComparisonSource
{
    /** @var FBFieldBaseOptions */
    public $Options;
    /** @var FBColumn */
    public $Column;
    public $Entry;
    /** @var CalculatorBase */
    public $Calculator;
    /** @var Loader */
    public $Loader;
    public function __construct($loader, $fbColumn, $options,$entry=null)
    {
        $this->Loader=$loader;
        $this->Column=$fbColumn;
        $this->Options=$options;

        $this->Entry=null;
        if($entry==null&&$this->Column!=null&&$this->Column->Row->Form->Entries!=null)
            foreach ($this->Column->Row->Form->Entries->Fields as $currentEntry )
            {
                if(!\is_array($currentEntry)) {
                    if(!isset($this->Options->GlobalId)) {
                        if ($currentEntry->Id == $this->Options->Id&&!isset($currentEntry->GlobalId))
                            $this->Entry = $currentEntry;
                    }else{
                        if (isset($currentEntry->GlobalId)&&$currentEntry->Id == $this->Options->Id&&$currentEntry->GlobalId==$this->Options->GlobalId)
                            $this->Entry = $currentEntry;
                    }


                }
            }
        else
            $this->Entry=$entry;

        if(isset($this->Options->PriceType))
        {
            $this->Calculator=CalculatorFactory::GetCalculator($this);
        }else
            $this->Calculator=new NoneCalculator($this);




    }

    public function GetOptionValue($optionName,$defaultValue)
    {
        if(!isset($this->Options->$optionName))
            return $defaultValue;
        return $this->Options->$optionName;
    }

    public function GetEntryValue($path,$default='',$entryObject=null){
        $entry=null;
        if($entryObject!==null)
            $entry=$entryObject;
        else
            $entry=$this->Entry;
        if($entry==null||!isset($entry->$path))
            return $default;

        return $entry->$path;
    }

    /**
     * @return \rednaowooextraproduct\core\Managers\FormManager\FormBuilder
     */
    public function GetForm(){
        if(isset($this->Column))
            if(isset($this->Column->Row))
                if(isset($this->Column->Row->Form))
                {
                    return $this->Column->Row->Form;
                }

        return null;
    }

    public function GetPrice(){
        if(isset($this->Options->PriceType)&& $this->Options->PriceType=='none')
        {
            $price=\floatval($this->GetText());
            if($price===false)
                return 0;

            return $price;

        }
        return $this->Calculator->GetPrice();
    }

    public function GetFixedValue($config)
    {
        if($config->Type=='Attribute')
        {
            return $this->GetRootForm()->GetAttributeValue($config->Id);
        }

        if($config->Type=='ProductInfo')
        {
            $variable=$this->GetRootForm()->GetSelectedVariable();
            if(!isset($variable[$config->Id]))
                return '';

            return $variable[$config->Id];
        }

        return '';
    }
    public function GetRootForm(){
        return $this->GetForm()->GetRootForm();

    }

    public function GetRegularPrice(){
        return trim($this->Options->Price);
    }

    public function GetSalePrice(){
        return trim($this->Options->SalePrice);
    }

    public function GetValue(){
        return $this->GetEntryValue('Value');
    }

    public function GetLineItems(){
        return array();
    }

    public function IsUsed(){
        return $this->GetValue()!=null&&$this->GetValue()!='';
    }

    public function GetText()
    {
        return $this->GetEntryValue('Value');
    }


    /**
     * @param $document DOMDocument
     */
    public function GetHtml($document){

        $span=new HtmlTagWrapper($document,$document->createElement('span'));
        $span->SetText($this->GetText());
        return $span;

    }

    public function CommitCreation()
    {
    }

    public function GetPriceWithoutFormula()
    {

        if($this->Calculator instanceof FormulaCalculator)
        {
            $price=floatval($this->GetText());
            if(!is_numeric($price))
                return 0;

            return $price;
        }
        return $this->GetPrice();
    }


}

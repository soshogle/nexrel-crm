<?php


namespace rednaowooextraproduct\core\Managers\FormManager;


use undefined\DTO\FBColumnOptions;
use undefined\DTO\FBRowOptions;

class FBRow
{
    /** @var FBRowOptions */
    public $Options;

    /** @var FBColumn[] */
    public $Columns;
    /** @var FormBuilder */
    public $Form;
    public $Loader;
    public function __construct($loader,$form,$options,$entry=null)
    {
        $this->Loader=$loader;
        $this->Form=$form;
        $this->Options=$options;

        $this->Columns=array();
        if($this->Options==null)
            return;
        foreach($this->Options->Columns as $column)
        {
            $entryData=null;
            if($entry!=null)
            {
                foreach($entry as $entryField)
                {
                    if($column->Field->Id==$entryField->Id)
                    {
                        $entryData=$entryField;
                    }
                }
                if($entryData==null)
                    continue;
            }
            $this->AddColumn( new FBColumn($this->Loader, $this, $column, $entryData));
        }
    }

    /**
     * @param $column FBColumn
     */
    public function AddColumn($column)
    {
        $this->Columns[] =$column;
    }


}
<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core;


abstract class NodeElementBase extends SlateElementBase
{
    /** @var SlateElementBase[] */
    public $Children;

    public function Initialize($parent,$generator,$slateObject)
    {
        parent::Initialize($parent,$generator,$slateObject);
        $this->Node=$this->CreateElement($this->GetNodeName());
        if($this->Parent!=null)
            $this->Parent->NodeContainer->AppendChild($this->Node);
        $this->PrepareNode();



        $this->Children=array();

        if(isset($slateObject->nodes))
        {
            foreach($slateObject->nodes as $node)
            {
                $slateNode=SlateNodeFactory::GetNode($node);
                $slateNode->Initialize($this,$generator,$node);
                $this->Children[]=$slateNode;
            }
        }


        if(isset($slateObject->leaves))
        {
            foreach($slateObject->leaves as $node)
            {
                $slateNode=SlateNodeFactory::GetNode($node);
                $slateNode->Initialize($this,$generator,$node);
                $this->Children[]=$slateNode;
            }
        }



    }


    protected function PrepareNode()
    {
        $this->NodeContainer=$this->Node;
    }

    public function Process()
    {
        foreach ($this->Children as $child)
            $child->Process();
    }

    /**
     * @return string
     */
    public abstract function GetNodeName();




}
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<div class="view-fields-demo view-fields-demo--default">
    <h3>${fn:escapeXml(currentNode.displayableName)}</h3>
    <p>${fn:escapeXml(currentNode.properties.intro.string)}</p>
</div>

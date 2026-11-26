<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<c:set var="tag" value="${currentNode.properties.listStyle.string eq 'numbered' ? 'ol' : 'ul'}"/>
<div class="view-fields-demo view-fields-demo--list">
    <h3>${fn:escapeXml(currentNode.displayableName)}</h3>
    <${tag}>
        <li>${fn:escapeXml(currentNode.properties.intro.string)}</li>
        <li>maxItems: ${fn:escapeXml(currentNode.properties.maxItems.string)}</li>
    </${tag}>
</div>

